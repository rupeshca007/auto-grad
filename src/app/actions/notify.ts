'use server'

export async function sendParentReport(studentName: string, score: number, feedback: string) {
  try {
    // In a real production application, this is where you would integrate
    // an email provider like Resend, SendGrid, or AWS SES.
    // e.g., await resend.emails.send({ to: parentEmail, subject: '...', text: '...' })
    
    // For this MVP, we simulate network latency and log to the console
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log(`[EMAIL DISPATCHED] To: Parent of ${studentName}`);
    console.log(`Score: ${score}/100`);
    console.log(`Feedback: ${feedback}`);
    console.log(`--------------------------------------------------`);

    return { success: true, message: `Report successfully dispatched to ${studentName}'s parent.` };
  } catch (error) {
    console.error("Dispatch Error:", error);
    return { success: false, message: 'Failed to dispatch report.' };
  }
}
