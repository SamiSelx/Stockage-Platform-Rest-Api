import { emailQueue } from "../queues/email.queue";
import { SendEmail } from "../utils/Email";

emailQueue.process(async (job, done) => {
  try {
    console.log("Job data 'email' : ",job.data);
    const {to, subject, text} = job.data
    await SendEmail({to,subject,text})
    done();
  } catch (err) {
    console.log(err);
    // if(err instanceof Error) throw new Error(err.message)
    //     throw new Error("Failed to send email")
    if (err instanceof Error) {
    done(err);
  } else {
    done(new Error("Unknown error occurred in email processor"));
  }

}
});
