interface ContactEmailParams {
	name: string;
	email: string;
	message: string;
}

export function contactEmailHtml({name, email, message}: ContactEmailParams) {
	return `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0a0a0a; border: 1px solid #1a1a1a;">
	<!-- Header -->
	<div style="padding: 24px 28px 20px; border-bottom: 1px solid #1a1a1a;">
		<div style="font-size: 10px; color: #555; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 12px;">
			<span style="color: #00f0d4;">$</span> incoming_transmission
		</div>
		<h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #e8e8e8;">
			New message from <span style="color: #00f0d4;">${name}</span>
		</h1>
	</div>

	<!-- Sender info -->
	<div style="padding: 16px 28px; background: #0f0f0f; border-bottom: 1px solid #1a1a1a;">
		<table style="width: 100%; border-collapse: collapse;">
			<tr>
				<td style="padding: 6px 0; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.15em; width: 80px;">
					<span style="color: #f0a500;">&#8594;</span> Name
				</td>
				<td style="padding: 6px 0; font-size: 13px; color: #e8e8e8;">${name}</td>
			</tr>
			<tr>
				<td style="padding: 6px 0; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.15em; width: 80px;">
					<span style="color: #f0a500;">&#8594;</span> Email
				</td>
				<td style="padding: 6px 0; font-size: 13px;">
					<a href="mailto:${email}" style="color: #00f0d4; text-decoration: none;">${email}</a>
				</td>
			</tr>
		</table>
	</div>

	<!-- Message body -->
	<div style="padding: 24px 28px;">
		<div style="font-size: 10px; color: #555; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px;">
			<span style="color: #f0a500;">&#8594;</span> Message
		</div>
		<div style="font-size: 14px; line-height: 1.7; color: #ccc; white-space: pre-wrap; padding: 16px; background: #0f0f0f; border: 1px solid #1a1a1a;">${message}</div>
	</div>

	<!-- Footer -->
	<div style="padding: 16px 28px; border-top: 1px solid #1a1a1a; text-align: center;">
		<span style="font-size: 10px; color: #333; letter-spacing: 0.15em;">
			Sent via portfolio contact form
		</span>
	</div>
</div>`;
}

export function contactEmailText({name, email, message}: ContactEmailParams) {
	return `Name: ${name}\nEmail: ${email}\n\n${message}`;
}
