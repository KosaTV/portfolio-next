import {NextResponse} from "next/server";
import nodemailer from "nodemailer";
import {contactEmailHtml, contactEmailText} from "./email-template";

export async function POST(req: Request) {
	const {name, email, message} = await req.json();

	if (!name || !email || !message) {
		return NextResponse.json({error: "All fields are required."}, {status: 400});
	}

	const transporter = nodemailer.createTransport({
		host: "smtp.gmail.com",
		port: 465,
		secure: true,
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS
		}
	});

	try {
		await transporter.sendMail({
			from: `"Portfolio Contact" <${process.env.SMTP_USER}>`,
			replyTo: `"${name}" <${email}>`,
			to: "ch.jakub23@gmail.com",
			subject: `${name} — Portfolio Contact`,
			text: contactEmailText({name, email, message}),
			html: contactEmailHtml({name, email, message})
		});

		return NextResponse.json({success: true});
	} catch (error) {
		console.error("Failed to send email:", error);
		return NextResponse.json({error: "Failed to send message."}, {status: 500});
	}
}
