#!/usr/bin/env python3
"""
Elegant Rate Limiter using asyncio primitives
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import uuid
from dataclasses import dataclass, field
import heapq


@dataclass
class Task:
    """Task with priority for queue management"""
    priority: float
    id: str
    query: str
    model: str
    submitted_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str = "queued"
    result: Optional[Dict] = None
    
    def __lt__(self, other):
        """For priority queue ordering"""
        return self.priority < other.priority


class ElegantRateLimiter:
    """Elegant rate limiter using asyncio.Semaphore and priority queue"""
    
    def __init__(self, max_requests: int = 10, window_minutes: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_minutes * 60
        
        # Semaphore for rate limiting
        self.processing_semaphore = asyncio.Semaphore(max_requests)
        
        # Priority queue for tasks
        self.task_queue: list = []  # Min heap
        self.queue_lock = asyncio.Lock()
        
        # Track all tasks
        self.tasks: Dict[str, Task] = {}
        
        # Track when slots will be available
        self.slot_release_times: list = []
        
        # Event for new tasks
        self.new_task_event = asyncio.Event()
    
    async def submit(self, query: str, model: str = "sonnet") -> Dict:
        """Submit a task - always succeeds by queuing"""
        task_id = f"{datetime.now().strftime('%H%M%S')}-{uuid.uuid4().hex[:6]}"
        now = datetime.now()
        
        # Calculate priority (FIFO with timestamp)
        priority = now.timestamp()
        
        task = Task(
            priority=priority,
            id=task_id,
            query=query,
            model=model,
            submitted_at=now
        )
        
        # Add to priority queue
        async with self.queue_lock:
            heapq.heappush(self.task_queue, task)
            queue_position = len(self.task_queue)
            self.tasks[task_id] = task
        
        # Signal new task available
        self.new_task_event.set()
        
        # Estimate wait time
        estimated_wait = await self._estimate_wait_time(queue_position)
        estimated_start = now + timedelta(seconds=estimated_wait)
        
        return {
            "task_id": task_id,
            "queue_position": queue_position,
            "estimated_wait_seconds": int(estimated_wait),
            "estimated_start": estimated_start.isoformat()
        }
    
    async def get_next_task(self) -> Optional[Dict]:
        """Get next task to process (called by processor)"""
        while True:
            # Check if we have tasks
            async with self.queue_lock:
                if not self.task_queue:
                    # No tasks, clear event and wait
                    self.new_task_event.clear()
                else:
                    # Try to acquire processing slot
                    acquired = self.processing_semaphore.locked()
                    if not acquired or self.processing_semaphore._value > 0:
                        # Can process a task
                        task = heapq.heappop(self.task_queue)
                        task.status = "processing"
                        task.started_at = datetime.now()
                        
                        # Acquire semaphore (non-blocking since we checked)
                        await self.processing_semaphore.acquire()
                        
                        # Schedule release after window
                        asyncio.create_task(
                            self._delayed_slot_release(self.window_seconds)
                        )
                        
                        return {
                            "id": task.id,
                            "query": task.query,
                            "model": task.model
                        }
            
            # Wait for new task or slot to become available
            wait_task = asyncio.create_task(self.new_task_event.wait())
            slot_task = asyncio.create_task(self._wait_for_slot())
            
            # Wait for either new task or available slot
            done, pending = await asyncio.wait(
                {wait_task, slot_task},
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel the other task
            for task in pending:
                task.cancel()
    
    async def mark_completed(self, task_id: str, result: Dict):
        """Mark task as completed"""
        if task_id in self.tasks:
            task = self.tasks[task_id]
            task.completed_at = datetime.now()
            task.status = result.get("status", "completed")
            task.result = result
    
    async def get_task_status(self, task_id: str) -> Optional[Dict]:
        """Get status of a specific task"""
        if task_id not in self.tasks:
            return None
        
        task = self.tasks[task_id]
        
        # Calculate queue position if still queued
        queue_position = 0
        if task.status == "queued":
            async with self.queue_lock:
                for queued_task in self.task_queue:
                    if queued_task.priority < task.priority:
                        queue_position += 1
                    if queued_task.id == task_id:
                        break
        
        return {
            "status": task.status,
            "model": task.model,
            "submitted_at": task.submitted_at.isoformat(),
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "queue_position": queue_position if task.status == "queued" else None,
            "result": task.result
        }
    
    def get_config(self) -> Dict:
        """Get current configuration and stats"""
        async def _get_queue_size():
            async with self.queue_lock:
                return len(self.task_queue)
        
        # Run async operation in sync context
        queue_size = asyncio.create_task(_get_queue_size())
        
        return {
            "max_requests": self.max_requests,
            "window_minutes": self.window_seconds // 60,
            "queue_size": len(self.task_queue),
            "active_slots": self.max_requests - self.processing_semaphore._value,
            "total_tasks": len(self.tasks)
        }
    
    async def _estimate_wait_time(self, position: int) -> float:
        """Estimate wait time based on queue position"""
        # Clean up old slot release times
        now = datetime.now()
        self.slot_release_times = [
            t for t in self.slot_release_times if t > now
        ]
        
        # If we have available slots
        available_slots = self.processing_semaphore._value
        if position <= available_slots:
            return 0  # Can start immediately
        
        # Calculate based on when slots will free up
        tasks_ahead = position - available_slots
        
        if self.slot_release_times:
            # Sort to find when nth slot will be free
            sorted_releases = sorted(self.slot_release_times)
            slot_index = min(tasks_ahead - 1, len(sorted_releases) - 1)
            earliest_slot = sorted_releases[slot_index]
            wait = (earliest_slot - now).total_seconds()
            return max(0, wait)
        
        # Fallback: estimate based on rate
        batches = (tasks_ahead - 1) // self.max_requests
        position_in_batch = tasks_ahead % self.max_requests
        seconds_per_task = self.window_seconds / self.max_requests
        
        return batches * self.window_seconds + position_in_batch * seconds_per_task
    
    async def _delayed_slot_release(self, delay: float):
        """Release slot after delay"""
        # Track when this slot will be released
        release_time = datetime.now() + timedelta(seconds=delay)
        self.slot_release_times.append(release_time)
        
        # Wait for the delay
        await asyncio.sleep(delay)
        
        # Release the slot
        self.processing_semaphore.release()
        
        # Signal that a slot is available
        self.new_task_event.set()
    
    async def _wait_for_slot(self):
        """Wait for a processing slot to become available"""
        if self.slot_release_times:
            now = datetime.now()
            next_release = min(t for t in self.slot_release_times if t > now)
            wait_seconds = (next_release - now).total_seconds()
            if wait_seconds > 0:
                await asyncio.sleep(wait_seconds)