import { Shield, Mail, Globe, Video, Brain, Lock, Trash2, FileText, ExternalLink } from "lucide-react";

export default function PrivacyPolicyPage() {
    const lastUpdated = "March 20, 2026";

    return (
        <main style={{ background: "var(--color-background)", minHeight: "100vh" }}>

            {/* Hero Header */}
            <section style={{
                padding: "calc(var(--spacing-xl) + 2rem) 0 var(--spacing-lg)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden"
            }}>
                <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at center top, rgba(var(--color-primary-rgb),0.06) 0%, transparent 60%)",
                    pointerEvents: "none"
                }} />
                <div className="container" style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                        <div style={{
                            width: "56px", height: "56px", borderRadius: "50%",
                            background: "rgba(var(--color-primary-rgb),0.1)", border: "1px solid rgba(var(--color-primary-rgb),0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                            <Shield size={28} color="var(--color-primary)" />
                        </div>
                    </div>
                    <p style={{
                        color: "var(--color-primary)", textTransform: "uppercase",
                        letterSpacing: "0.2em", fontSize: "0.8rem", marginBottom: "1rem"
                    }}>
                        Data Protection
                    </p>
                    <h1 style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "var(--color-text-main)",
                        marginBottom: "0.75rem", lineHeight: 1.2
                    }}>
                        Privacy Policy
                    </h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem" }}>
                        Last updated: {lastUpdated}
                    </p>
                    <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center", gap: "0.75rem" }}>
                        <a
                            href="/rodo"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                                color: "var(--color-primary)", fontSize: "0.85rem",
                                textDecoration: "none", opacity: 0.8
                            }}
                        >
                            <FileText size={14} />
                            Wersja polska (RODO)
                        </a>
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="container" style={{ maxWidth: "800px", paddingBottom: "var(--spacing-xl)" }}>
                <div style={{
                    background: "var(--color-surface)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "var(--radius-lg)",
                    padding: "clamp(2rem, 4vw, 3rem)",
                    boxShadow: "0 4px 30px rgba(0,0,0,0.3)"
                }}>

                    {/* 1. Data Controller */}
                    <PolicySection icon={<Shield size={20} />} number="1" title="Data Controller">
                        <p>The controller of your personal data is:</p>
                        <div style={{
                            background: "rgba(var(--color-primary-rgb),0.05)",
                            border: "1px solid rgba(var(--color-primary-rgb),0.1)",
                            borderRadius: "8px",
                            padding: "1rem 1.25rem",
                            marginTop: "0.75rem",
                        }}>
                            <p style={{ fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.25rem" }}>
                                Mikrostomart Gabinet Stomatologiczny
                            </p>
                            <p>Marcin Nowosielski</p>
                            <p>ul. Centralna 33a, 45-940 Opole, Poland</p>
                            <p>NIP: 7542680826</p>
                            <p style={{ marginTop: "0.5rem" }}>
                                Email: <a href="mailto:kontakt@mikrostomart.pl" style={{ color: "var(--color-primary)" }}>kontakt@mikrostomart.pl</a>
                            </p>
                            <p>
                                Phone: <a href="tel:+48570270470" style={{ color: "var(--color-primary)" }}>+48 570 270 470</a>
                            </p>
                        </div>
                    </PolicySection>

                    {/* 2. Data We Collect */}
                    <PolicySection icon={<FileText size={20} />} number="2" title="Data We Collect">
                        <p style={{ marginBottom: "0.75rem" }}>We collect and process the following categories of data:</p>
                        
                        <h4 style={{ color: "var(--color-text-main)", fontSize: "0.95rem", marginBottom: "0.5rem", marginTop: "1rem" }}>
                            A. Patient Data
                        </h4>
                        <ul>
                            <li>Name, phone number, email address</li>
                            <li>Medical history and treatment records</li>
                            <li>Appointment scheduling data</li>
                            <li>Communication preferences (SMS, email, push notifications)</li>
                        </ul>

                        <h4 style={{ color: "var(--color-text-main)", fontSize: "0.95rem", marginBottom: "0.5rem", marginTop: "1rem" }}>
                            B. Social Media Content Data
                        </h4>
                        <ul>
                            <li>Video recordings uploaded for social media publishing</li>
                            <li>AI-generated transcriptions and translations of video content</li>
                            <li>AI-generated metadata (titles, descriptions, hashtags)</li>
                            <li>Video processing status and analytics</li>
                        </ul>

                        <h4 style={{ color: "var(--color-text-main)", fontSize: "0.95rem", marginBottom: "0.5rem", marginTop: "1rem" }}>
                            C. Website Usage Data
                        </h4>
                        <ul>
                            <li>Browser type, IP address, device information</li>
                            <li>Pages visited and interactions</li>
                            <li>Cookies and similar tracking technologies</li>
                        </ul>
                    </PolicySection>

                    {/* 3. Social Media & Video Processing */}
                    <PolicySection icon={<Video size={20} />} number="3" title="Social Media Content & Video Processing">
                        <p style={{ marginBottom: "0.75rem" }}>
                            We operate social media accounts on various platforms to share educational dental content,
                            clinic updates, and patient stories (with explicit consent). Our video processing pipeline includes:
                        </p>

                        <h4 style={{ color: "var(--color-text-main)", fontSize: "0.95rem", marginBottom: "0.5rem", marginTop: "1rem" }}>
                            Video Processing Pipeline
                        </h4>
                        <ul>
                            <li><strong>Upload:</strong> Videos are uploaded to our secure cloud storage (Supabase, hosted in EU)</li>
                            <li><strong>Transcription:</strong> Audio is transcribed using OpenAI Whisper API for caption generation</li>
                            <li><strong>AI Analysis:</strong> Content is analyzed by OpenAI GPT-4o to generate appropriate titles, descriptions, and hashtags</li>
                            <li><strong>Captioning:</strong> Professional captions are added using Captions/Mirage API</li>
                            <li><strong>Publishing:</strong> Processed videos are published to social media platforms after manual review</li>
                        </ul>

                        <h4 style={{ color: "var(--color-text-main)", fontSize: "0.95rem", marginBottom: "0.5rem", marginTop: "1rem" }}>
                            Platforms We Publish To
                        </h4>
                        <ul>
                            <li><strong>TikTok</strong> — via TikTok Content Posting API</li>
                            <li><strong>YouTube</strong> — via YouTube Data API</li>
                            <li><strong>Instagram</strong> — via Meta Graph API</li>
                            <li><strong>Facebook</strong> — via Meta Graph API</li>
                        </ul>

                        <p style={{ marginTop: "0.75rem" }}>
                            <strong>Important:</strong> Patient-identifying content is never published without explicit, written consent.
                            All educational and promotional content features only clinic staff who have consented to appear in social media materials.
                        </p>
                    </PolicySection>

                    {/* 4. TikTok API */}
                    <PolicySection icon={<Globe size={20} />} number="4" title="TikTok API Usage">
                        <p style={{ marginBottom: "0.75rem" }}>
                            We use the TikTok Content Posting API to publish educational dental content to our clinic&apos;s TikTok account.
                            Specifically:
                        </p>
                        
                        <h4 style={{ color: "var(--color-text-main)", fontSize: "0.95rem", marginBottom: "0.5rem", marginTop: "1rem" }}>
                            Data We Access via TikTok API
                        </h4>
                        <ul>
                            <li>Video upload capability (Content Posting API)</li>
                            <li>Publishing status and video metadata</li>
                            <li>We do <strong>not</strong> access any TikTok user data, follower information, or analytics via the API</li>
                        </ul>

                        <h4 style={{ color: "var(--color-text-main)", fontSize: "0.95rem", marginBottom: "0.5rem", marginTop: "1rem" }}>
                            How We Use TikTok API
                        </h4>
                        <ul>
                            <li>To publish pre-approved, captioned dental educational videos</li>
                            <li>All content undergoes manual review before publishing</li>
                            <li>Videos contain only dental health tips, clinic information, and consenting staff members</li>
                            <li>We do not collect, store, or process any TikTok end-user data</li>
                        </ul>

                        <h4 style={{ color: "var(--color-text-main)", fontSize: "0.95rem", marginBottom: "0.5rem", marginTop: "1rem" }}>
                            Data Retention for TikTok
                        </h4>
                        <ul>
                            <li>Video files are stored on our servers (Supabase, EU) during processing</li>
                            <li>After successful publishing, raw video files may be retained for backup purposes</li>
                            <li>TikTok API access tokens are stored securely as encrypted environment variables</li>
                            <li>No TikTok user data is stored on our systems</li>
                        </ul>
                    </PolicySection>

                    {/* 5. AI & Third-Party Processors */}
                    <PolicySection icon={<Brain size={20} />} number="5" title="AI Processing & Third-Party Services">
                        <p style={{ marginBottom: "0.75rem" }}>
                            We use the following third-party services to process data:
                        </p>
                        <ul>
                            <li><strong>OpenAI (Whisper & GPT-4o)</strong> — for speech-to-text transcription and content analysis. Data is processed per OpenAI&apos;s <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)" }}>Privacy Policy</a>. API data is not used for model training.</li>
                            <li><strong>Captions / Mirage</strong> — for adding professional captions to videos. Videos are processed and returned; not stored permanently by the service.</li>
                            <li><strong>Supabase</strong> — for database and file storage (EU region). Compliant with GDPR.</li>
                            <li><strong>Vercel</strong> — for website hosting and serverless functions. Processes requests in EU/US regions.</li>
                            <li><strong>SMSAPI.pl</strong> — for sending SMS notifications to patients (Polish company, GDPR compliant).</li>
                            <li><strong>Resend</strong> — for transactional email delivery.</li>
                            <li><strong>Stripe</strong> — for payment processing (PCI DSS compliant).</li>
                        </ul>
                    </PolicySection>

                    {/* 6. Legal Basis */}
                    <PolicySection icon={<FileText size={20} />} number="6" title="Legal Basis for Processing">
                        <p style={{ marginBottom: "0.75rem" }}>We process personal data under the following legal bases (GDPR Article 6):</p>
                        <ul>
                            <li><strong>Consent (Art. 6(1)(a))</strong> — for marketing communications, social media content featuring patients, push notifications</li>
                            <li><strong>Contract Performance (Art. 6(1)(b))</strong> — for appointment booking, treatment records, payment processing</li>
                            <li><strong>Legal Obligation (Art. 6(1)(c))</strong> — for medical record keeping as required by Polish healthcare law</li>
                            <li><strong>Legitimate Interest (Art. 6(1)(f))</strong> — for clinic promotion via social media (educational content), website analytics, service improvement</li>
                        </ul>
                    </PolicySection>

                    {/* 7. Data Security */}
                    <PolicySection icon={<Lock size={20} />} number="7" title="Data Security">
                        <p style={{ marginBottom: "0.75rem" }}>We implement appropriate technical and organizational measures to protect your data:</p>
                        <ul>
                            <li>All data transmissions are encrypted using TLS/SSL (HTTPS)</li>
                            <li>Database access is restricted with row-level security policies</li>
                            <li>API keys and credentials are stored as encrypted environment variables</li>
                            <li>Admin and employee access is protected with role-based access control (RBAC)</li>
                            <li>Patient data access is logged for GDPR audit compliance</li>
                            <li>Regular security reviews and dependency updates</li>
                        </ul>
                    </PolicySection>

                    {/* 8. Your Rights */}
                    <PolicySection icon={<Shield size={20} />} number="8" title="Your Rights (GDPR)">
                        <p style={{ marginBottom: "0.75rem" }}>Under the General Data Protection Regulation (GDPR), you have the right to:</p>
                        <ul>
                            <li><strong>Access</strong> — request a copy of your personal data</li>
                            <li><strong>Rectification</strong> — correct inaccurate personal data</li>
                            <li><strong>Erasure</strong> — request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
                            <li><strong>Restriction</strong> — request restriction of processing</li>
                            <li><strong>Portability</strong> — receive your data in a machine-readable format</li>
                            <li><strong>Objection</strong> — object to processing based on legitimate interest</li>
                            <li><strong>Withdraw Consent</strong> — withdraw previously given consent at any time</li>
                        </ul>
                        <p style={{ marginTop: "0.75rem" }}>
                            To exercise any of these rights, contact us at{" "}
                            <a href="mailto:kontakt@mikrostomart.pl" style={{ color: "var(--color-primary)" }}>
                                kontakt@mikrostomart.pl
                            </a>.
                            We will respond within 30 days as required by GDPR.
                        </p>
                    </PolicySection>

                    {/* 9. Data Retention */}
                    <PolicySection icon={<Trash2 size={20} />} number="9" title="Data Retention">
                        <ul>
                            <li><strong>Medical Records:</strong> Retained for 20 years as required by Polish healthcare law (Ustawa o prawach pacjenta)</li>
                            <li><strong>Appointment Data:</strong> Retained for 3 years after the last visit</li>
                            <li><strong>Marketing Communications:</strong> Until consent is withdrawn</li>
                            <li><strong>Video Content:</strong> Retained on our servers during processing; published content remains on respective social media platforms until manually removed</li>
                            <li><strong>Website Logs:</strong> Retained for 90 days</li>
                            <li><strong>Account Data:</strong> Until account deletion is requested</li>
                        </ul>
                    </PolicySection>

                    {/* 10. Cookies */}
                    <PolicySection icon={<Globe size={20} />} number="10" title="Cookies">
                        <p style={{ marginBottom: "0.75rem" }}>Our website uses cookies for:</p>
                        <ul>
                            <li><strong>Essential cookies</strong> — required for website functionality (session, authentication)</li>
                            <li><strong>Preference cookies</strong> — remembering language selection and user preferences</li>
                            <li><strong>Analytics cookies</strong> — understanding website usage patterns</li>
                        </ul>
                        <p style={{ marginTop: "0.75rem" }}>
                            You can manage cookie preferences in your browser settings.
                        </p>
                    </PolicySection>

                    {/* 11. Supervisory Authority */}
                    <PolicySection icon={<ExternalLink size={20} />} number="11" title="Supervisory Authority">
                        <p>
                            If you believe your data protection rights have been violated, you have the right to lodge a complaint with the Polish Data Protection Authority:
                        </p>
                        <div style={{
                            background: "rgba(var(--color-primary-rgb),0.05)",
                            border: "1px solid rgba(var(--color-primary-rgb),0.1)",
                            borderRadius: "8px",
                            padding: "1rem 1.25rem",
                            marginTop: "0.75rem",
                        }}>
                            <p style={{ fontWeight: 600, color: "var(--color-text-main)", marginBottom: "0.25rem" }}>
                                Urząd Ochrony Danych Osobowych (UODO)
                            </p>
                            <p>ul. Stawki 2, 00-193 Warszawa, Poland</p>
                            <p>
                                Website: <a href="https://uodo.gov.pl" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)" }}>uodo.gov.pl</a>
                            </p>
                        </div>
                    </PolicySection>

                    {/* 12. Contact & Changes */}
                    <PolicySection icon={<Mail size={20} />} number="12" title="Contact & Policy Changes" last>
                        <p style={{ marginBottom: "0.75rem" }}>
                            For any questions about this Privacy Policy or our data practices, please contact:
                        </p>
                        <ul>
                            <li>Email: <a href="mailto:kontakt@mikrostomart.pl" style={{ color: "var(--color-primary)" }}>kontakt@mikrostomart.pl</a></li>
                            <li>Phone: <a href="tel:+48570270470" style={{ color: "var(--color-primary)" }}>+48 570 270 470</a></li>
                            <li>Address: ul. Centralna 33a, 45-940 Opole, Poland</li>
                        </ul>
                        <p style={{ marginTop: "0.75rem" }}>
                            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. We encourage you to review this page periodically.
                        </p>
                    </PolicySection>

                </div>
            </section>
        </main>
    );
}

/* Reusable section component matching the /rodo page design */
function PolicySection({ icon, number, title, children, last }: {
    icon: React.ReactNode; number: string; title: string; children: React.ReactNode; last?: boolean;
}) {
    return (
        <div style={{
            marginBottom: last ? 0 : "2rem",
            paddingBottom: last ? 0 : "2rem",
            borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)"
        }}>
            <h2 style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.1rem",
                color: "var(--color-primary)",
                marginBottom: "0.75rem",
                display: "flex", alignItems: "center", gap: "0.75rem"
            }}>
                <span style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: "rgba(var(--color-primary-rgb),0.1)", border: "1px solid rgba(var(--color-primary-rgb),0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontFamily: "var(--font-sans)", fontWeight: 700,
                    flexShrink: 0
                }}>{number}</span>
                {title}
            </h2>
            <div style={{
                color: "var(--color-text-muted)", lineHeight: 1.8, fontSize: "0.92rem",
                paddingLeft: "calc(28px + 0.75rem)"
            }}>
                <style>{`
                    .pp-content ul { list-style: none; padding: 0; margin: 0; }
                    .pp-content li {
                        padding: 0.35rem 0 0.35rem 1.25rem;
                        position: relative;
                    }
                    .pp-content li::before {
                        content: '';
                        position: absolute; left: 0; top: 0.85rem;
                        width: 4px; height: 4px; border-radius: 50%;
                        background: var(--color-primary); opacity: 0.5;
                    }
                    .pp-content p { margin-bottom: 0; }
                    .pp-content h4 { margin-top: 0; }
                `}</style>
                <div className="pp-content">
                    {children}
                </div>
            </div>
        </div>
    );
}
