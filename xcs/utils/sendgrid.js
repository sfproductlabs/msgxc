const sendgrid = require('@sendgrid/mail');
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
sendgrid.setSubstitutionWrappers('{{', '}}'); // Configure the substitution tag wrappers globally
//Use Like msg.sendmsg
//subject,from, substitutions : {{'old, 'new'},{'old2','new2'}}, templateId, text, html, to = "asdads,asdasd"
const sendEmail = function (params) {
	var msg = {};
	if (typeof params.to !== 'string')
		throw {code: httpCodes.UNPROCESSABLE_ENTITY, msg: 'Invalid Recipient (Email)'};
	msg.to = params.to.split(",");
	msg.subject = params.subject;
	msg.from = params.from || process.env.SENDGRID_SENDER;
	if (params.replyTo)
		msg.replyTo = params.replyTo;
	if (typeof params.substitutions !== 'undefined' && params.substitutions) {
		msg.substitutions = params.substitutions;
	}
	if (typeof params.template === 'string' && params.template.length > 0) {
		msg.templateId = params.template;
	}
	else {
		msg.text = ' ';
		if (typeof params.text === 'string' && params.text.length > 0)
			msg.text = params.text;

		msg.html = '&nbsp;';
		if (typeof params.html === 'string' && params.html.length > 0)
			msg.html = params.html;
		else
			msg.html += msg.text;
	};
	sendgrid.sendMultiple(msg);
};

module.exports = {
	sendEmail: sendEmail
};