/**
 * Sorts a list of tasks in a dependency-aware, priority-first, and due-date-first way.
 * 
 * Ordering logic:
 * 1. Completed tasks are placed at the bottom, sorted by completedDate (newest first).
 * 2. Uncompleted tasks are sorted using a priority-aware topological sort:
 *    - Blocker tasks are placed before the tasks they block.
 *    - Among tasks that are ready (no uncompleted blockers), they are prioritized by:
 *      a. Priority level (critical > high > medium > low)
 *      b. Due date (earlier due dates first; tasks with due dates before those without)
 *      c. Creation date (older first)
 *      d. Stable fallback (ID string comparison)
 *    - Cycles or orphaned tasks are handled safely by appending them at the end of open tasks.
 * 
 * @param {Array<object>} tasks The list of tasks to sort.
 * @returns {Array<object>} The sorted list of tasks.
 */
export function sortTasks(tasks) {
  if (!tasks || !Array.isArray(tasks)) return [];

  // Separate completed and uncompleted tasks
  const completed = tasks.filter(t => t.status === 'completed');
  const uncompleted = tasks.filter(t => t.status !== 'completed');

  // Sort completed tasks by completedDate (newest first), falling back to creation date
  completed.sort((a, b) => {
    if (a.completedDate && b.completedDate) {
      return new Date(b.completedDate) - new Date(a.completedDate);
    }
    if (a.completedDate) return -1;
    if (b.completedDate) return 1;
    
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA; // newest created completed tasks first
  });

  // Prepare topological sort lookup structures for uncompleted tasks
  const taskMap = new Map(uncompleted.map(t => [t.id, t]));
  const inDegree = {};
  const adj = {};

  uncompleted.forEach(t => {
    inDegree[t.id] = 0;
    adj[t.id] = [];
  });

  uncompleted.forEach(t => {
    // Only block on tasks that are currently uncompleted and exist in our set
    const activeBlockers = (t.blockedBy || []).filter(blockerId => taskMap.has(blockerId));
    inDegree[t.id] = activeBlockers.length;
    activeBlockers.forEach(blockerId => {
      adj[blockerId].push(t.id);
    });
  });

  // Ready list of tasks (no uncompleted blockers)
  const ready = uncompleted.filter(t => inDegree[t.id] === 0);

  // Helper to calculate priority weight
  const getPriorityWeight = (p) => {
    switch (p?.toLowerCase()) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  // Sorts a list of tasks in place using secondary criteria
  const sortReadyList = (list) => {
    list.sort((a, b) => {
      // 1. Priority (descending)
      const pA = getPriorityWeight(a.priority);
      const pB = getPriorityWeight(b.priority);
      if (pA !== pB) return pB - pA;

      // 2. Due date (ascending, soonest first; tasks with due dates first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      // 3. Creation date (ascending, oldest first)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;

      // 4. Stable fallback
      return a.id.localeCompare(b.id);
    });
  };

  const sortedUncompleted = [];
  const visited = new Set();

  while (ready.length > 0) {
    // Re-sort to pick the best task available
    sortReadyList(ready);
    const curr = ready.shift();
    
    sortedUncompleted.push(curr);
    visited.add(curr.id);

    const neighbors = adj[curr.id] || [];
    neighbors.forEach(neighborId => {
      inDegree[neighborId]--;
      if (inDegree[neighborId] === 0) {
        const neighbor = taskMap.get(neighborId);
        if (neighbor && !visited.has(neighborId)) {
          ready.push(neighbor);
        }
      }
    });
  }

  // Handle cycles or orphans safely (tasks that were never visited due to cyclic dependencies)
  if (sortedUncompleted.length < uncompleted.length) {
    const cycleTasks = uncompleted.filter(t => !visited.has(t.id));
    sortReadyList(cycleTasks);
    sortedUncompleted.push(...cycleTasks);
  }

  return [...sortedUncompleted, ...completed];
}
