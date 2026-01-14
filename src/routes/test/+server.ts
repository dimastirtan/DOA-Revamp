import type { RequestHandler } from './$types';
import nodemailer from 'nodemailer';


export const GET: RequestHandler = async () => {
	const transporter = nodemailer.createTransport({
		host: '10.1.0.6',
		port: 25,
		secure: false,
		tls: {
			rejectUnauthorized: false
		}
	});

	await transporter.sendMail({
		from: "noreply@indonesian-aerospace.com",
		to: ['hi@rasyiid.com', 'minthi@ioneric.id'],
		subject: 'Nyobo Email',
		text: 'Nyobo email tok',
		html: '<b>HTML NYOBO</b>'
	});

	return new Response();
};
