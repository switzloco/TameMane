/**
 * TameMane Notification Service
 * 
 * Sends rich notifications to Discord via webhook.
 * Setup: Create a Discord webhook in your server's channel settings,
 * then add VITE_DISCORD_WEBHOOK_URL to .env.local
 */

const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL;

const COLORS = {
  info: 0x3b82f6,     // blue
  success: 0x22c55e,  // green
  warning: 0xf59e0b,  // amber
  error: 0xef4444,    // red
  research: 0x8b5cf6, // purple
};

/**
 * Send a notification to Discord.
 * @param {string} title - Embed title
 * @param {string} message - Embed body (supports markdown)
 * @param {'info'|'success'|'warning'|'error'|'research'} type - Color theme
 * @param {Array<{name: string, value: string, inline?: boolean}>} fields - Optional embed fields
 */
export async function sendDiscordNotification(title, message, type = 'info', fields = []) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('Discord webhook URL not configured. Skipping notification.');
    return;
  }

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'TameMane Agent',
        embeds: [{
          title,
          description: message.slice(0, 4096), // Discord embed limit
          color: COLORS[type] || COLORS.info,
          timestamp: new Date().toISOString(),
          footer: { text: 'TameMane Orchestrator' },
          fields: fields.slice(0, 25), // Discord field limit
        }]
      })
    });
  } catch (err) {
    console.error('Failed to send Discord notification:', err);
  }
}

/**
 * Notify that a task was completed and list any tasks that are now unblocked.
 * @param {object} completedTask - The task that was just completed
 * @param {Array<object>} unblockedTasks - Tasks that are now unblocked as a result
 */
export async function notifyTaskCompleted(completedTask, unblockedTasks = []) {
  let message = `**${completedTask.title}** has been marked as completed.`;

  if (unblockedTasks.length > 0) {
    const names = unblockedTasks.map(t => `• ${t.title}`).join('\n');
    message += `\n\n🔓 **Now unblocked:**\n${names}`;
  }

  await sendDiscordNotification('✅ Task Completed', message, 'success');
}

/**
 * Notify that research has been completed for a task.
 * @param {object} task - The task that was researched
 * @param {string} findings - The research findings summary
 */
export async function notifyResearchReady(task, findings) {
  const preview = findings.length > 300 ? findings.slice(0, 300) + '...' : findings;
  await sendDiscordNotification(
    `🔍 Research Ready: ${task.title}`,
    preview,
    'research'
  );
}
