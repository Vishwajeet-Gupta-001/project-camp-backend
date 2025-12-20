import Mailgen from "mailgen";
import nodemailer from "nodemailer"

//this is for sending the mail.

const sendEmail = async (options) =>{
    const mailGenerator=new Mailgen({
        theme:"default",
        product:{
            name:"Task Manager",
            link:"https://taskmanagelink.com"
        }
    })
    
    const emailTextual=mailGenerator.generatePlaintext(options.MailgenContent)
    
    const emailHtml=mailGenerator.generate(options.MailgenContent)

    //now for sending the email

    const transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_SMTP_HOST,
      port: process.env.MAILTRAP_SMTP_PORT,
      auth: {
        user: process.env.MAILTRAP_SMTP_USER,
        pass: process.env.MAILTRAP_SMTP_PASS,
      },
    });

    const mail = {
        form:"mail.taskManager@example.com",
        to:options.email,
        subject:options.subject,
        text:emailTextual,
        html:emailHtml
    }

    try {
        await transporter.sendMail(mail)
    } catch (error) {
        console.error("Email service failed silently.Make sure oyu have provided your MAILTRAP credentials in the .env file correctly.")
        console.error("Error : ",error)
    }
}

//this is just generating the mail and not sending it.

const emailVerificationMailgenContent = (username, verficationURL) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our app😎😘🤗.We are excited to have to onboard!!.",
      action: {
        instructions:
          "To verify your email please click on the following button.",
        button: {
          color: "#c81fe2ff",
          text: "Verify your email",
          link: verficationURL, //to send this where
        },
      },
      outro:
        "Need help or have any questions? Just reply to this email to help you.",
    },
  };
};

//this for forgot password mail generation

const forgotPasswordMailgenContent = (username, passwordResetURL) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account.",
      action: {
        instructions:
          "To reset your password please click on the following button or link.",
        button: {
          color: "#0deef2ff",
          text: "Reset your password",
          link: passwordResetURL, //to send this where
        },
      },
      outro:
        "Need help or have any questions? Just reply to this email to help you.",
    },
  };
};

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail
};