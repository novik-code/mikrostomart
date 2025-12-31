import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, name, email, phone, message, service, date } = body;

        const resendKey = process.env.RESEND_API_KEY;

        // MOCK MODE if no key
        if (!resendKey) {
            console.log("--- [MOCK EMAIL] ---");
            console.log("Type:", type);
            console.log("Data:", body);
            console.log("--------------------");

            // Artificial delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            return NextResponse.json({ success: true, mock: true });
        }

        const resend = new Resend(resendKey);
        const adminEmail = "marcinnowosielski@gmail.com"; // Should be env but hardcoding for now as verified sender usually
        const fromEmail = "onboarding@resend.dev"; // Default Resend testing email

        let subject = "";
        let htmlContent = "";

        if (type === "reservation") {
            subject = `Nowa Rezerwacja: ${name}`;
            htmlContent = `
                <h1>Nowa Rezerwacja Wizyty</h1>
                <p><strong>Imię i Nazwisko:</strong> ${name}</p>
                <p><strong>Telefon:</strong> ${phone}</p>
                <p><strong>Email:</strong> ${email || "Brak"}</p>
                <p><strong>Usługa:</strong> ${service}</p>
                <p><strong>Data:</strong> ${date}</p>
            `;
        } else if (type === "contact") {
            subject = `Nowa Wiadomość: ${name}`;
            htmlContent = `
                <h1>Nowa Wiadomość ze Strony</h1>
                <p><strong>Imię:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Wiadomość:</strong><br/>${message}</p>
            `;
        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        await resend.emails.send({
            from: fromEmail,
            to: adminEmail,
            subject: subject,
            html: htmlContent,
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Contact API Error:", error);
        return NextResponse.json(
            { error: "Failed to send message" },
            { status: 500 }
        );
    }
}
