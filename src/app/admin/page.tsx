"use client";

import { useState, useEffect } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";
import AppointmentInstructionsEditor from "@/components/AppointmentInstructionsEditor";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    ShoppingBag,
    Calendar,
    Package,
    FileText,
    HelpCircle,
    BookOpen,
    Newspaper,
    LogOut,
    Settings,
    Menu,
    X,
    Users,
    MessageCircle,
    Shield
} from "lucide-react";

type Product = {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
    image: string;
    gallery?: string[];
    isVisible?: boolean;
};

export default function AdminPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        price: 0,
        description: "",
        category: "Inne",
        image: "",
        gallery: "", // temporary string for input
        isVisible: true
    });

    const [products, setProducts] = useState<Product[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'questions' | 'articles' | 'news' | 'orders' | 'reservations' | 'blog' | 'patients' | 'sms-reminders' | 'appointment-instructions' | 'roles' | 'employees'>('dashboard');
    const [questions, setQuestions] = useState<any[]>([]);
    const [articles, setArticles] = useState<any[]>([]);
    const [blogPosts, setBlogPosts] = useState<any[]>([]); // New Blog Posts state
    const [generationStatus, setGenerationStatus] = useState<Record<string, string>>({});
    const [orders, setOrders] = useState<any[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);

    // Roles state
    const [rolesUsers, setRolesUsers] = useState<any[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [rolesError, setRolesError] = useState<string | null>(null);
    const [patientCandidates, setPatientCandidates] = useState<any[]>([]);
    const [promotingEmail, setPromotingEmail] = useState<string | null>(null);

    // Employees state
    const [employeesList, setEmployeesList] = useState<any[]>([]);
    const [registeredEmployees, setRegisteredEmployees] = useState<any[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [prodentisAvailable, setProdentisAvailable] = useState(true);
    const [employeeEmails, setEmployeeEmails] = useState<Record<string, string>>({});
    const [addingEmployee, setAddingEmployee] = useState<string | null>(null);
    const [newManualName, setNewManualName] = useState('');
    const [newManualEmail, setNewManualEmail] = useState('');
    const [addingManual, setAddingManual] = useState(false);
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

    // SMS Reminders state
    const [smsReminders, setSmsReminders] = useState<any[]>([]);
    const [smsStats, setSmsStats] = useState({ total: 0, draft: 0, sent: 0, failed: 0, cancelled: 0 });
    const [editingSmsId, setEditingSmsId] = useState<string | null>(null);
    const [editingSmsMessage, setEditingSmsMessage] = useState('');
    const [sendingAll, setSendingAll] = useState(false);
    const [smsTab, setSmsTab] = useState<'drafts' | 'sent' | 'manual'>('drafts');
    const [sentDateFilter, setSentDateFilter] = useState<string>('');

    // Manual SMS state
    const [manualPhone, setManualPhone] = useState('');
    const [manualMessage, setManualMessage] = useState('');
    const [manualPatientName, setManualPatientName] = useState('');
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
    const [searchingPatients, setSearchingPatients] = useState(false);
    const [sendingManual, setSendingManual] = useState(false);

    const [manualGenerationStatus, setManualGenerationStatus] = useState<string | null>(null);
    const [skippedPatients, setSkippedPatients] = useState<Array<{
        patientName: string;
        doctorName: string;
        appointmentTime: string;
        appointmentType: string;
        reason: string;
    }>>([]);

    // SMS Templates state
    const [smsTemplates, setSmsTemplates] = useState<any[]>([]);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [editingTemplateText, setEditingTemplateText] = useState('');
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);

    // Appointment Instructions state
    const [appointmentInstructions, setAppointmentInstructions] = useState<any[]>([]);
    const [editingInstruction, setEditingInstruction] = useState<any | null>(null);
    const [savingInstruction, setSavingInstruction] = useState(false);


    // Responsive State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setIsMobileMenuOpen(false); // Reset on desktop
            }
        };
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/admin/login");
            } else {
                fetchProducts();
                fetchQuestions();
                fetchArticles();
                fetchNews();
                fetchBlogPosts(); // Fetch blog posts
                fetchOrders();
                fetchReservations();
                fetchPatients(); // Fetch patients
                fetchSmsReminders(); // Fetch SMS reminders
                if (activeTab === 'roles') fetchRoles(); // Fetch roles on tab switch
                if (activeTab === 'employees') fetchEmployees(); // Fetch employees on tab switch
            }
        };
        checkUser();
    }, [activeTab]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/admin/login");
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/products");
            if (res.ok) setProducts(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };


    const fetchQuestions = async () => {
        try {
            const res = await fetch("/api/admin/questions");
            if (res.ok) setQuestions(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchArticles = async () => {
        try {
            const res = await fetch("/api/admin/articles");
            if (res.ok) setArticles(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("Usunąć pytanie?")) return;
        try {
            await fetch(`/api/admin/questions?id=${id}`, {
                method: "DELETE"
            });
            fetchQuestions();
        } catch (e) { alert("Błąd"); }
    };

    const handleDeleteArticle = async (id: string) => {
        if (!confirm("Usunąć artykuł trwale?")) return;
        try {
            const res = await fetch(`/api/admin/articles?id=${id}`, {
                method: "DELETE"
            });
            if (res.ok) fetchArticles();
            else alert("Błąd usuwania");
        } catch (e) { alert("Błąd"); }
    };

    // --- NEWS HANDLERS ---
    const [news, setNews] = useState<any[]>([]);
    const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
    const [newsFormData, setNewsFormData] = useState({
        title: "",
        date: new Date().toISOString().split('T')[0],
        excerpt: "",
        content: "",
        image: ""
    });

    const fetchNews = async () => {
        try {
            const res = await fetch("/api/admin/news");
            if (res.ok) setNews(await res.json());
        } catch (err) { console.error(err); }
    };

    // --- BLOG HANDLERS ---
    const [editingBlogPostId, setEditingBlogPostId] = useState<string | null>(null);
    const [blogFormData, setBlogFormData] = useState({
        title: "",
        slug: "",
        date: new Date().toISOString().split('T')[0],
        excerpt: "",
        content: "",
        image: "",
        tags: ""
    });

    const fetchBlogPosts = async () => {
        try {
            const res = await fetch("/api/admin/blog");
            if (res.ok) setBlogPosts(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSaveBlogPost = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { ...blogFormData };
            if (editingBlogPostId) payload.id = editingBlogPostId;
            // Handle tags split
            if (typeof payload.tags === 'string') {
                payload.tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            }

            const method = editingBlogPostId ? "PUT" : "POST";
            const res = await fetch("/api/admin/blog", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed");
            await fetchBlogPosts();
            resetBlogForm();
        } catch (err) { alert("Błąd zapisu posta"); }
    };

    const handleDeleteBlogPost = async (id: string) => {
        if (!confirm("Usunąć post z bloga?")) return;
        try {
            await fetch(`/api/admin/blog?id=${id}`, {
                method: "DELETE"
            });
            fetchBlogPosts();
        } catch (e) { alert("Błąd"); }
    };

    const handleEditBlogPost = (p: any) => {
        setEditingBlogPostId(p.id);
        setBlogFormData({
            title: p.title,
            slug: p.slug,
            date: p.date ? new Date(p.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            excerpt: p.excerpt || "",
            content: p.content || "",
            image: p.image || "",
            tags: p.tags ? p.tags.join(", ") : ""
        });
    };

    const resetBlogForm = () => {
        setEditingBlogPostId(null);
        setBlogFormData({ title: "", slug: "", date: new Date().toISOString().split('T')[0], excerpt: "", content: "", image: "", tags: "" });
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/admin/orders");
            if (res.ok) setOrders(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSaveNews = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { ...newsFormData };
            if (editingNewsId) payload.id = editingNewsId;

            const method = editingNewsId ? "PUT" : "POST";
            const res = await fetch("/api/admin/news", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed");
            await fetchNews();
            resetNewsForm();
        } catch (err) { alert("Błąd zapisu newsa"); }
    };

    const handleDeleteNews = async (id: string) => {
        if (!confirm("Usunąć news?")) return;
        try {
            await fetch(`/api/admin/news?id=${id}`, {
                method: "DELETE"
            });
            fetchNews();
        } catch (e) { alert("Błąd"); }
    };

    const handleEditNews = (n: any) => {
        setEditingNewsId(n.id);
        setNewsFormData({
            title: n.title,
            date: n.date,
            excerpt: n.excerpt,
            content: n.content,
            image: n.image
        });
    };


    // --- AI GENERATOR HANDLERS ---
    const [aiTopic, setAiTopic] = useState("");
    const [aiInstructions, setAiInstructions] = useState("");
    const [aiModel, setAiModel] = useState("flux-dev"); // Default to better model
    const [isGenerating, setIsGenerating] = useState(false);

    const handleAiGenerate = async () => {
        if (!aiTopic) {
            alert("Wpisz temat artykułu");
            return;
        }
        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/news/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: aiTopic,
                    instructions: aiInstructions,
                    model: aiModel
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Błąd generowania");
            }

            const data = await res.json();

            // Populate form
            setNewsFormData({
                title: data.title,
                date: new Date().toISOString().split('T')[0],
                excerpt: data.excerpt,
                content: data.content,
                image: data.image
            });

            alert("Wygenerowano pomyślnie! Sprawdź formularz poniżej.");
        } catch (e: any) {
            alert("Błąd: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- BLOG AI GENERATOR (dedicated) ---
    const handleBlogAiGenerate = async () => {
        if (!aiTopic) {
            alert("Wpisz temat posta");
            return;
        }
        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/blog/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: aiTopic,
                    instructions: aiInstructions,
                    model: aiModel
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Błąd generowania");
            }

            const data = await res.json();

            // Populate BLOG form (not news form!)
            setBlogFormData({
                title: data.title,
                slug: data.slug || "",
                date: new Date().toISOString().split('T')[0],
                excerpt: data.excerpt || "",
                content: data.content || "",
                image: data.image || "",
                tags: Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "")
            });

            alert("Wygenerowano pomyślnie! Sprawdź formularz poniżej.");
        } catch (e: any) {
            alert("Błąd: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const resetNewsForm = () => {
        setEditingNewsId(null);
        setNewsFormData({ title: "", date: new Date().toISOString().split('T')[0], excerpt: "", content: "", image: "" });
    };

    const handleGenerateDailyArticle = async () => {
        if (!confirm("Wygenerować dzienny artykuł (Flux Pro / DALL-E)?\nJeśli nie ma pytań oczekujących, temat zostanie wymyślony przez AI.")) return;
        setManualGenerationStatus("Start...");

        try {
            const res = await fetch("/api/cron/daily-article"); // No custom headers, session cookie used

            if (!res.body) throw new Error("Brak strumienia");
            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                const lines = text.split("\n");

                for (const line of lines) {
                    if (line.startsWith("STEP:")) {
                        setManualGenerationStatus(line.replace("STEP:", "").trim());
                    } else if (line.startsWith("SUCCESS:")) {
                        const data = JSON.parse(line.replace("SUCCESS:", ""));
                        alert(`Sukces! Utworzono: ${data.title}`);
                        setManualGenerationStatus(null);
                        fetchArticles();
                    } else if (line.startsWith("ERROR:")) {
                        // Don't alert immediately for Flux error if fallback happens,
                        // but the stream sends ERROR line for fallback too.
                        // The server code sends `ERROR: Flux failed... Fallback...`
                        // We can show this in status.
                        if (line.includes("Flux failed")) {
                            setManualGenerationStatus("Flux failed. Fallback to DALL-E...");
                        } else {
                            alert(`Błąd: ${line.replace("ERROR:", "")}`);
                            setManualGenerationStatus(null);
                        }
                    } else if (line.startsWith("TOPIC:")) {
                        setManualGenerationStatus(`Temat: ${line.replace("TOPIC:", "")}`);
                    }
                }
            }
        } catch (e: any) {
            alert("Błąd połączenia: " + e.message);
            setManualGenerationStatus(null);
        }
    };

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/reservations");
            if (res.ok) setReservations(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleDeleteReservation = async (id: string) => {
        if (!confirm("Czy na pewno usunąć rezerwację?")) return;
        await fetch(`/api/admin/reservations?id=${id}`, { method: "DELETE" });
        fetchReservations();
    };

    // Patient Functions
    const fetchPatients = async () => {
        try {
            const res = await fetch('/api/admin/patients');
            if (res.ok) {
                const data = await res.json();
                setPatients(data.patients || []);
            }
        } catch (err) {
            console.error('Failed to fetch patients:', err);
        }
    };

    const handleDeletePatient = async (id: string) => {
        if (confirm('Czy na pewno chcesz usunąć konto tego pacjenta?')) {
            try {
                const res = await fetch(`/api/admin/patients?id=${id}`, {
                    method: 'DELETE',
                });

                if (res.ok) {
                    setPatients(patients.filter((p) => p.id !== id));
                    alert('Konto pacjenta zostało usunięte');
                } else {
                    alert('Nie udało się usunąć konta');
                }
            } catch (err) {
                console.error('Failed to delete patient:', err);
                alert('Błąd podczas usuwania konta');
            }
        }
    };

    const handleApprovePatient = async (id: string) => {
        if (confirm('Zatwierdzić konto tego pacjenta? Otrzyma email powitalny.')) {
            try {
                const res = await fetch('/api/admin/patients/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ patient_id: id }),
                });

                if (res.ok) {
                    fetchPatients();
                    alert('Konto zatwierdzone! Pacjent otrzymał email.');
                } else {
                    const error = await res.json();
                    alert(`Błąd: ${error.error || 'Nie udało się zatwierdzić konta'}`);
                }
            } catch (err) {
                console.error('Failed to approve patient:', err);
                alert('Błąd podczas zatwierdzania konta');
            }
        }
    };

    const handleRejectPatient = async (id: string) => {
        const reason = prompt('Podaj powód odrzucenia konta (będzie wysłany do pacjenta):');
        if (reason && reason.trim()) {
            try {
                const res = await fetch('/api/admin/patients/reject', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patient_id: id,
                        reason: reason.trim()
                    }),
                });

                if (res.ok) {
                    fetchPatients();
                    alert('Konto odrzucone. Pacjent otrzymał email z powodem.');
                } else {
                    const error = await res.json();
                    alert(`Błąd: ${error.error || 'Nie udało się odrzucić konta'}`);
                }
            } catch (err) {
                console.error('Failed to reject patient:', err);
                alert('Błąd podczas odrzucania konta');
            }
        } else if (reason !== null) {
            alert('Powód odrzucenia jest wymagany');
        }
    };

    // Roles Functions
    const fetchRoles = async () => {
        setRolesLoading(true);
        setRolesError(null);
        try {
            const res = await fetch('/api/admin/roles');
            if (res.ok) {
                const data = await res.json();
                setRolesUsers(data.users || []);
                setPatientCandidates(data.patientCandidates || []);
            } else {
                const errData = await res.json();
                setRolesError(errData.error || 'Blad pobierania danych');
            }
        } catch (err) {
            console.error('Failed to fetch roles:', err);
            setRolesError('Blad polaczenia z serwerem');
        } finally {
            setRolesLoading(false);
        }
    };

    const toggleRole = async (userId: string, email: string, role: string, hasRole: boolean) => {
        try {
            if (hasRole) {
                // Revoke
                const res = await fetch('/api/admin/roles', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, role }),
                });
                if (!res.ok) {
                    const errData = await res.json();
                    alert(errData.error || 'Blad usuwania roli');
                    return;
                }
            } else {
                // Grant
                const res = await fetch('/api/admin/roles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, email, role }),
                });
                if (!res.ok) {
                    const errData = await res.json();
                    alert(errData.error || 'Blad nadawania roli');
                    return;
                }
            }
            fetchRoles();
        } catch (err) {
            console.error('Failed to toggle role:', err);
            alert('Blad polaczenia z serwerem');
        }
    };

    const promotePatient = async (email: string, rolesToGrant: string[]) => {
        if (!confirm(`Czy na pewno chcesz awansować ${email} i nadać role: ${rolesToGrant.join(', ')}?\n\nZostanie utworzone konto Supabase Auth z linkiem do ustawienia hasła.`)) {
            return;
        }
        setPromotingEmail(email);
        try {
            const res = await fetch('/api/admin/roles/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientEmail: email,
                    roles: rolesToGrant,
                    sendPasswordReset: true,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`✅ ${data.message}`);
                fetchRoles();
            } else {
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch (err) {
            console.error('Promote error:', err);
            alert('Błąd połączenia z serwerem');
        } finally {
            setPromotingEmail(null);
        }
    };

    const dismissPatient = async (patientId: string, email: string) => {
        if (!confirm(`Ukryć ${email} z listy awansowania?`)) return;
        try {
            const res = await fetch('/api/admin/roles/dismiss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId }),
            });
            if (res.ok) {
                setPatientCandidates(prev => prev.filter(p => p.id !== patientId));
            } else {
                alert('Błąd ukrywania pacjenta');
            }
        } catch {
            alert('Błąd połączenia');
        }
    };

    const sendResetPassword = async (email: string) => {
        if (!confirm(`Wyślij email z resetem hasła do ${email}?`)) return;
        try {
            const res = await fetch('/api/admin/roles/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientEmail: email, roles: [], sendPasswordReset: true }),
            });
            if (res.ok) {
                alert('✅ Email z linkiem do ustawienia hasła został wysłany!');
            } else {
                const data = await res.json();
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch {
            alert('Błąd połączenia');
        }
    };

    const deleteUser = async (userId: string, email: string) => {
        if (!confirm(`⚠️ UWAGA: Czy na pewno chcesz TRWALE usunąć konto ${email}?\n\nTej operacji nie można cofnąć!`)) return;
        try {
            const res = await fetch('/api/admin/roles/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) {
                alert('✅ Konto zostało usunięte');
                fetchRoles();
            } else {
                const data = await res.json();
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch {
            alert('Błąd połączenia');
        }
    };

    // Employee Functions
    const fetchEmployees = async () => {
        setEmployeesLoading(true);
        try {
            const res = await fetch('/api/admin/employees');
            if (res.ok) {
                const data = await res.json();
                setEmployeesList(data.staff || []);
                setRegisteredEmployees(data.registeredEmployees || []);
                setProdentisAvailable(data.prodentisAvailable ?? false);
            } else {
                console.error('Failed to fetch employees');
            }
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        } finally {
            setEmployeesLoading(false);
        }
    };

    const addEmployee = async (staffId: string, staffName: string) => {
        const email = employeeEmails[staffId]?.trim();
        if (!email) {
            alert('Podaj adres email pracownika');
            return;
        }
        if (!email.includes('@')) {
            alert('Podaj poprawny adres email');
            return;
        }
        setAddingEmployee(staffId);
        try {
            const res = await fetch('/api/admin/roles/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientEmail: email,
                    roles: ['employee'],
                    sendPasswordReset: true,
                    employeeName: staffName,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`\u2705 ${data.message}`);
                setEmployeeEmails(prev => ({ ...prev, [staffId]: '' }));
                fetchEmployees();
            } else {
                alert(`\u274c B\u0142\u0105d: ${data.error}`);
            }
        } catch (err) {
            console.error('Add employee error:', err);
            alert('B\u0142\u0105d po\u0142\u0105czenia z serwerem');
        } finally {
            setAddingEmployee(null);
        }
    };

    const addManualEmployee = async () => {
        const name = newManualName.trim();
        const email = newManualEmail.trim();
        if (!name) { alert('Podaj imi\u0119 i nazwisko'); return; }
        if (!email || !email.includes('@')) { alert('Podaj poprawny adres email'); return; }
        if (!confirm(`Utworzy\u0107 konto pracownika?\n\n${name}\n${email}`)) return;
        setAddingManual(true);
        try {
            const res = await fetch('/api/admin/roles/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientEmail: email,
                    roles: ['employee'],
                    sendPasswordReset: true,
                    employeeName: name,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`\u2705 ${data.message}`);
                setNewManualName('');
                setNewManualEmail('');
                fetchEmployees();
            } else {
                alert(`\u274c B\u0142\u0105d: ${data.error}`);
            }
        } catch {
            alert('B\u0142\u0105d po\u0142\u0105czenia');
        } finally {
            setAddingManual(false);
        }
    };

    const removeEmployee = async (userId: string, email: string) => {
        if (!confirm(`Usun\u0105\u0107 rol\u0119 pracownika dla ${email}?`)) return;
        try {
            const res = await fetch('/api/admin/roles', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: 'employee' }),
            });
            if (res.ok) {
                alert('\u2705 Rola usuni\u0119ta');
                fetchEmployees();
            } else {
                const data = await res.json();
                alert(`\u274c ${data.error}`);
            }
        } catch {
            alert('B\u0142\u0105d po\u0142\u0105czenia');
        }
    };


    const renderEmployeesTab = () => {
        if (employeesLoading && employeesList.length === 0) {
            return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Ładowanie danych z Prodentis...</div>;
        }

        return (
            <div>
                {/* Prodentis connection status */}
                {!prodentisAvailable && (
                    <div style={{
                        padding: '0.75rem 1rem', marginBottom: '1.5rem',
                        background: '#eab30815', border: '1px solid #eab30840',
                        borderRadius: '8px', fontSize: '0.85rem', color: '#eab308'
                    }}>
                        ⚠️ Brak połączenia z Prodentis — lista pracowników może być niepełna. Możesz dodać pracownika ręcznie poniżej.
                    </div>
                )}

                {/* Header */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                            Pracownicy z Prodentis ({employeesList.length})
                        </h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Kliknij na osobę, aby rozwinąć i dodać konto
                        </p>
                    </div>
                    <button onClick={fetchEmployees} style={{
                        padding: '0.4rem 1rem', background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)', borderRadius: '6px',
                        color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '0.85rem'
                    }}>Odśwież</button>
                </div>

                {employeesList.length === 0 && !employeesLoading ? (
                    <div style={{
                        textAlign: 'center', padding: '2rem',
                        background: 'var(--color-surface)', borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                    }}>
                        Brak danych z Prodentis. Spróbuj odświeżyć lub dodaj pracownika ręcznie.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {employeesList.map((staff: any) => {
                            const isExpanded = expandedStaffId === staff.id;
                            return (
                                <div key={staff.id} style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '10px',
                                    border: `1px solid ${isExpanded ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s',
                                }}>
                                    {/* Collapsed header — always visible, clickable */}
                                    <div
                                        onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                                        style={{
                                            padding: '0.85rem 1.25rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{
                                                fontSize: '0.9rem',
                                                transition: 'transform 0.2s',
                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                display: 'inline-block',
                                            }}>▶</span>
                                            <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                                                {staff.name}
                                            </span>
                                        </div>
                                        <span style={{
                                            padding: '0.15rem 0.6rem',
                                            borderRadius: '10px',
                                            fontSize: '0.7rem',
                                            fontWeight: '600',
                                            background: staff.hasAccount ? '#22c55e22' : '#ffffff10',
                                            color: staff.hasAccount ? '#22c55e' : 'var(--color-text-muted)',
                                        }}>
                                            {staff.hasAccount ? '✅ Ma konto' : '—'}
                                        </span>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                padding: '0 1.25rem 1rem 2.5rem',
                                                borderTop: '1px solid var(--color-border)',
                                                paddingTop: '0.75rem',
                                            }}
                                        >
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                                Prodentis ID: {staff.id}
                                            </div>

                                            {staff.hasAccount ? (
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                                                        📧 {staff.accountEmail}
                                                    </div>
                                                    {staff.grantedAt && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                                            Dodano: {new Date(staff.grantedAt).toLocaleDateString('pl-PL')}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                                                        <button
                                                            onClick={() => sendResetPassword(staff.accountEmail)}
                                                            style={{
                                                                padding: '0.35rem 0.8rem',
                                                                background: 'transparent',
                                                                color: 'var(--color-text-muted)',
                                                                border: '1px solid var(--color-border)',
                                                                borderRadius: '5px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem',
                                                            }}
                                                        >
                                                            🔑 Reset hasła
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                        Podaj adres email, aby utworzyć konto pracownika. Pracownik otrzyma email z linkiem do ustawienia hasła.
                                                    </p>
                                                    <div style={{
                                                        display: 'flex', gap: '0.5rem', alignItems: 'center',
                                                        flexWrap: 'wrap',
                                                    }}>
                                                        <input
                                                            type="email"
                                                            placeholder="Adres email pracownika..."
                                                            value={employeeEmails[staff.id] || ''}
                                                            onChange={(e) => setEmployeeEmails(prev => ({ ...prev, [staff.id]: e.target.value }))}
                                                            style={{
                                                                flex: 1, minWidth: '200px',
                                                                padding: '0.5rem 0.75rem',
                                                                borderRadius: '6px',
                                                                border: '2px solid var(--color-border)',
                                                                background: 'var(--color-background)',
                                                                color: 'var(--color-text-main)',
                                                                fontSize: '0.9rem',
                                                                fontFamily: 'inherit',
                                                            }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') addEmployee(staff.id, staff.name); }}
                                                        />
                                                        <button
                                                            onClick={() => addEmployee(staff.id, staff.name)}
                                                            disabled={addingEmployee === staff.id || !employeeEmails[staff.id]?.trim()}
                                                            style={{
                                                                padding: '0.5rem 1.25rem',
                                                                background: (!employeeEmails[staff.id]?.trim() || addingEmployee === staff.id) ? '#444' : 'var(--color-primary)',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                color: '#000',
                                                                fontWeight: 'bold',
                                                                cursor: (!employeeEmails[staff.id]?.trim() || addingEmployee === staff.id) ? 'not-allowed' : 'pointer',
                                                                fontSize: '0.85rem',
                                                                transition: 'all 0.2s',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {addingEmployee === staff.id ? '⏳ Tworzę...' : '➕ Dodaj konto'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Registered employees not in Prodentis */}
                {registeredEmployees.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--color-text-main)' }}>
                            Pozostałe konta pracownicze ({registeredEmployees.length})
                        </h3>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Konta z rolą pracownika, które nie są powiązane z operatorem Prodentis
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {registeredEmployees.map((emp: any) => (
                                <div key={emp.id} style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '10px',
                                    padding: '0.75rem 1rem',
                                    border: '1px solid var(--color-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    flexWrap: 'wrap',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)', fontSize: '0.9rem' }}>
                                            {emp.name}
                                        </div>
                                        {emp.name !== emp.accountEmail && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                                                📧 {emp.accountEmail}
                                            </div>
                                        )}
                                        {emp.grantedAt && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                                Dodano: {new Date(emp.grantedAt).toLocaleDateString('pl-PL')}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeEmployee(emp.userId, emp.accountEmail)}
                                        style={{
                                            padding: '0.3rem 0.7rem',
                                            background: 'transparent',
                                            color: 'var(--color-error, #ef4444)',
                                            border: '1px solid var(--color-error, #ef4444)',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        ✖ Usuń rolę
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Manual add (for staff not in Prodentis) */}
                <div style={{
                    marginTop: '2rem',
                    background: 'var(--color-surface)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    border: '1px dashed var(--color-border)',
                }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--color-text-main)' }}>
                        ➕ Dodaj ręcznie (np. recepcja, asystentka)
                    </h3>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Dla pracowników, którzy nie występują jako operatorzy w Prodentis
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                Imię i nazwisko
                            </label>
                            <input
                                type="text"
                                placeholder="np. Anna Kowalska"
                                value={newManualName}
                                onChange={(e) => setNewManualName(e.target.value)}
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '2px solid var(--color-border)',
                                    background: 'var(--color-background)',
                                    color: 'var(--color-text-main)',
                                    fontSize: '0.9rem',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                Adres email
                            </label>
                            <input
                                type="email"
                                placeholder="pracownik@email.pl"
                                value={newManualEmail}
                                onChange={(e) => setNewManualEmail(e.target.value)}
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    border: '2px solid var(--color-border)',
                                    background: 'var(--color-background)',
                                    color: 'var(--color-text-main)',
                                    fontSize: '0.9rem',
                                    fontFamily: 'inherit',
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') addManualEmployee(); }}
                            />
                        </div>
                        <button
                            onClick={addManualEmployee}
                            disabled={addingManual || !newManualName.trim() || !newManualEmail.trim()}
                            style={{
                                padding: '0.5rem 1.25rem',
                                background: (addingManual || !newManualName.trim() || !newManualEmail.trim()) ? '#444' : 'var(--color-primary)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#000',
                                fontWeight: 'bold',
                                cursor: (addingManual || !newManualName.trim() || !newManualEmail.trim()) ? 'not-allowed' : 'pointer',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {addingManual ? '⏳...' : '➕ Dodaj'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };


    // SMS Reminders Functions
    const fetchSmsReminders = async () => {
        try {
            // Fetch ALL SMS (draft, sent, failed) to populate both tabs
            const res = await fetch('/api/admin/sms-reminders');
            if (res.ok) {
                const data = await res.json();
                setSmsReminders(data.reminders);
                setSmsStats(data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch SMS reminders:', err);
        }
    };

    const handleEditSms = async (id: string, message: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/sms-reminders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    sms_message: message,
                    edited_by: user?.email || 'admin@mikrostomart.pl'
                })
            });

            if (res.ok) {
                setEditingSmsId(null);
                setEditingSmsMessage('');
                fetchSmsReminders();
                alert('SMS zaktualizowany');
            }
        } catch (err) {
            alert('Błąd aktualizacji');
        }
    };

    const handleDeleteSms = async (id: string) => {
        if (!confirm('Anulować ten SMS?')) return;

        try {
            const res = await fetch(`/api/admin/sms-reminders?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchSmsReminders();
                alert('SMS anulowany');
            }
        } catch (err) {
            alert('Błąd');
        }
    };

    const handleDeleteAllDrafts = async () => {
        if (!confirm(`Usunąć wszystkie szkice SMS (${smsStats.draft})?`)) return;

        try {
            const res = await fetch('/api/admin/sms-reminders?id=all-drafts', {
                method: 'DELETE'
            });

            if (res.ok) {
                const result = await res.json();
                fetchSmsReminders();
                alert(`Usunięto ${result.deleted} szkiców`);
            }
        } catch (err) {
            alert('Błąd usuwania');
        }
    };

    // Manual SMS Generation (Trigger Cron)
    const handleManualGenerate = async () => {
        if (!confirm('Wywołać cron job do generowania SMS na jutro?')) return;

        setManualGenerationStatus('Wywołuję cron job...');
        try {
            const res = await fetch('/api/cron/appointment-reminders?manual=true', {
                method: 'GET'
            });

            if (res.ok) {
                const result = await res.json();
                setManualGenerationStatus(
                    `✅ Sukces!\n` +
                    `📊 Processed: ${result.processed}\n` +
                    `✅ Drafts: ${result.draftsCreated}\n` +
                    `⏭️ Skipped: ${result.skipped}\n` +
                    `❌ Failed: ${result.failed || 0}`
                );

                // Save skipped patients for display
                setSkippedPatients(result.skippedPatients || []);

                // Refresh SMS list
                setTimeout(() => {
                    fetchSmsReminders();
                    setManualGenerationStatus(null);
                }, 3000);
            } else {
                const errorText = await res.text();
                setManualGenerationStatus(`❌ Błąd (${res.status}): ${errorText}`);
            }
        } catch (err: any) {
            setManualGenerationStatus(`❌ Błąd: ${err.message}`);
        }
    };

    const handleSendAllSms = async () => {
        if (!confirm(`Wysłać ${smsStats.draft} SMS przypomnień?`)) return;

        setSendingAll(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/sms-reminders/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reminder_ids: 'all',
                    sent_by: user?.email || 'admin@mikrostomart.pl'
                })
            });

            if (res.ok) {
                const result = await res.json();
                alert(`✅ Wysłano: ${result.sent}\n❌ Błędy: ${result.failed}`);
                fetchSmsReminders();
            }
        } catch (err) {
            alert('Błąd wysyłania');
        } finally {
            setSendingAll(false);
        }
    };

    const handleSendSingleSms = async (id: string) => {
        if (!confirm('Wysłać ten SMS teraz?')) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/sms-reminders/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reminder_ids: [id],
                    sent_by: user?.email || 'admin@mikrostomart.pl'
                })
            });

            if (res.ok) {
                fetchSmsReminders();
                alert('SMS wysłany!');
            }
        } catch (err) {
            alert('Błąd wysyłania');
        }
    };

    const handleResendSms = async (sms: any) => {
        if (!confirm(`Wysłać ponownie SMS do ${sms.patient_name || sms.phone}?`)) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/sms-reminders/send-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: sms.phone,
                    message: sms.sms_message,
                    patient_name: sms.patient_name,
                    sent_by: user?.email || 'admin@mikrostomart.pl'
                })
            });

            const result = await res.json();
            if (result.success) {
                alert('SMS wysłany ponownie!');
                fetchSmsReminders();
            } else {
                alert(`Błąd: ${result.error}`);
            }
        } catch (err) {
            alert('Błąd wysyłania');
        }
    };

    const handleSearchPatients = async (query: string) => {
        setPatientSearchQuery(query);
        if (query.length < 2) {
            setPatientSearchResults([]);
            return;
        }

        setSearchingPatients(true);
        try {
            const res = await fetch(`/api/admin/patients/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setPatientSearchResults(data.patients || []);
            }
        } catch (err) {
            console.error('Patient search error:', err);
        } finally {
            setSearchingPatients(false);
        }
    };

    const handleSelectPatient = (patient: any) => {
        setManualPatientName(`${patient.firstName} ${patient.lastName}`);
        setManualPhone(patient.phone || '');
        setPatientSearchQuery('');
        setPatientSearchResults([]);
    };

    const handleSendManualSms = async () => {
        if (!manualPhone || !manualMessage) {
            alert('Wypełnij numer telefonu i treść SMS');
            return;
        }
        if (!confirm(`Wysłać SMS do ${manualPatientName || manualPhone}?`)) return;

        setSendingManual(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/admin/sms-reminders/send-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: manualPhone,
                    message: manualMessage,
                    patient_name: manualPatientName,
                    sent_by: user?.email || 'admin@mikrostomart.pl'
                })
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ SMS wysłany!');
                setManualPhone('');
                setManualMessage('');
                setManualPatientName('');
                fetchSmsReminders();
            } else {
                alert(`❌ Błąd: ${result.error}`);
            }
        } catch (err) {
            alert('Błąd wysyłania');
        } finally {
            setSendingManual(false);
        }
    };



    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const payload: any = { ...formData };
            // Convert gallery string back to array
            if (payload.gallery) {
                payload.gallery = payload.gallery.split(",").map((s: string) => s.trim()).filter(Boolean);
            } else {
                payload.gallery = [];
            }

            if (editingId) payload.id = editingId;
            else payload.id = Date.now().toString(); // Simple ID generation

            const res = await fetch("/api/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Błąd zapisu (Unauthorized or Invalid Data)");
            }

            await fetchProducts();
            resetForm();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Wystąpił nieoczekiwany błąd.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Czy na pewno chcesz usunąć ten produkt?")) return;

        try {
            const res = await fetch(`/api/products?id=${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed");
            await fetchProducts();
        } catch (err) {
            alert("Błąd usuwania");
        }
    };

    const handleEdit = (product: Product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name,
            price: product.price,
            description: product.description,
            category: product.category,
            image: product.image,
            gallery: product.gallery ? product.gallery.join(", ") : "",
            isVisible: product.isVisible ?? true
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: "", price: 0, description: "", category: "Inne", image: "", gallery: "", isVisible: true });
    };

    const inputStyle = {
        padding: "0.8rem",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--color-surface-hover)",
        background: "var(--color-background)",
        color: "var(--color-text-main)",
        fontSize: "1rem",
        outline: "none"
    };



    const renderNewsTab = () => (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                {/* NEWS FORM */}
                <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", position: "sticky", top: "2rem" }}>

                    {/* AI GENERATOR SECTION */}
                    <div style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid var(--color-border)" }}>
                        <h3 style={{ marginBottom: "1rem", color: "var(--color-primary)" }}>✨ Generator AI</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <input
                                placeholder="Temat artykułu (np. Wybielanie zębów)"
                                value={aiTopic}
                                onChange={(e) => setAiTopic(e.target.value)}
                                style={inputStyle}
                            />
                            <textarea
                                placeholder="Dodatkowe wskazówki (np. wspomnij o metodzie Beyond)"
                                value={aiInstructions}
                                onChange={(e) => setAiInstructions(e.target.value)}
                                style={inputStyle}
                                rows={2}
                            />
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                <span style={{ fontWeight: "bold" }}>Silnik:</span>
                                <select
                                    value={aiModel}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="flux-dev">Flux Pro (Realistyczny - Zalecany)</option>
                                    <option value="dall-e-3">DALL-E 3 (Standard)</option>
                                </select>
                            </div>
                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                className="btn-primary"
                                style={{
                                    width: "100%",
                                    opacity: isGenerating ? 0.7 : 1,
                                    position: "relative",
                                    background: "linear-gradient(135deg, #dcb14a, #f0c96c)" // Gold gradient
                                }}
                            >
                                {isGenerating ? "Generowanie (ok. 30s)..." : "Generuj Treść i Zdjęcie 🪄"}
                            </button>
                        </div>
                    </div>

                    {/* AI BILLING INFO */}
                    <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "var(--color-surface-hover)", borderRadius: "var(--radius-md)", fontSize: "0.9rem" }}>
                        <h4 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            💳 Zarządzanie Środkami (Płatności)
                        </h4>
                        <p style={{ marginBottom: "1rem" }}>
                            Płatności za AI są realizowane bezpośrednio u dostawców. Jeśli generowanie przestanie działać, sprawdź stan konta:
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer"
                                style={{ display: "block", padding: "0.8rem", background: "rgba(16, 163, 127, 0.2)", color: "#10a37f", textDecoration: "none", borderRadius: "4px", textAlign: "center", fontWeight: "bold", border: "1px solid rgba(16, 163, 127, 0.4)" }}>
                                Obecny stan konta OpenAI ↗<br /><span style={{ fontSize: "0.8rem", fontWeight: "normal" }}>(GPT-4o, DALL-E 3)</span>
                            </a>
                            <a href="https://replicate.com/account/billing" target="_blank" rel="noopener noreferrer"
                                style={{ display: "block", padding: "0.8rem", background: "rgba(255, 255, 255, 0.1)", color: "white", textDecoration: "none", borderRadius: "4px", textAlign: "center", fontWeight: "bold", border: "1px solid rgba(255,255,255,0.2)" }}>
                                Doładuj konto Replicate ↗<br /><span style={{ fontSize: "0.8rem", fontWeight: "normal" }}>(Flux Pro)</span>
                            </a>
                        </div>
                    </div>

                    <h2 style={{ marginBottom: "1rem" }}>{editingNewsId ? "Edytuj News" : "Dodaj News"}</h2>
                    <form onSubmit={handleSaveNews} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <input required placeholder="Tytuł" value={newsFormData.title} onChange={(e) => setNewsFormData({ ...newsFormData, title: e.target.value })} style={inputStyle} />
                        <input required type="date" value={newsFormData.date} onChange={(e) => setNewsFormData({ ...newsFormData, date: e.target.value })} style={inputStyle} />
                        <textarea placeholder="Krótki opis (Excerpt)" rows={3} value={newsFormData.excerpt} onChange={(e) => setNewsFormData({ ...newsFormData, excerpt: e.target.value })} style={inputStyle} />
                        <textarea placeholder="Treść (Markdown/HTML)" rows={6} value={newsFormData.content} onChange={(e) => setNewsFormData({ ...newsFormData, content: e.target.value })} style={inputStyle} />
                        <input placeholder="Link do zdjęcia" value={newsFormData.image} onChange={(e) => setNewsFormData({ ...newsFormData, image: e.target.value })} style={inputStyle} />
                        {newsFormData.image && (
                            <div style={{ marginTop: "0.5rem", border: "1px solid var(--color-border)", padding: "0.5rem", borderRadius: "var(--radius-sm)" }}>
                                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>Podgląd:</p>
                                <img src={newsFormData.image} alt="Podgląd" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "4px", objectFit: "cover" }} />
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingNewsId ? "Zapisz Zmiany" : "Dodaj"}</button>
                            {editingNewsId && <button type="button" onClick={resetNewsForm} style={{ padding: "1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", cursor: "pointer" }}>Anuluj</button>}
                        </div>
                    </form>
                </div>
            </div>

            <div style={{ marginTop: "3rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Lista Aktualności</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {news.length === 0 ? <p>Brak aktualności.</p> : news.map(n => (
                        <div key={n.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{n.title}</h3>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{n.date}</span>
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <img src={n.image} alt={n.title} style={{ maxWidth: "100%", height: "auto", borderRadius: "4px", maxHeight: "150px", objectFit: "cover" }} />
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button onClick={() => handleEditNews(n)} style={{ padding: "0.5rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer" }}>Edytuj</button>
                                <button onClick={() => handleDeleteNews(n.id)} style={{ padding: "0.5rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );

    const renderArticlesTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>Baza Wiedzy (Blog)</h2>
                {manualGenerationStatus ? (
                    <span style={{ color: "var(--color-primary)", fontWeight: "bold" }}>
                        Generator Cron: {manualGenerationStatus}
                    </span>
                ) : (
                    <button
                        onClick={handleGenerateDailyArticle}
                        className="btn-primary"
                        style={{ background: "linear-gradient(135deg, #dcb14a, #f0c96c)", color: "black", fontSize: "0.9rem" }}
                    >
                        Generuj Losowy Artykuł (Flux) 🎲
                    </button>
                )}
            </div>
            {articles.length === 0 ? <p>Brak artykułów.</p> : articles.map(a => (
                <div key={a.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{a.title}</h3>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{a.published_date}</span>
                    </div>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>/{a.slug}</p>
                    <button onClick={() => handleDeleteArticle(a.id)} style={{ padding: "0.5rem 1rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń</button>
                </div>
            ))}
        </div>
    );

    const renderOrdersTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2>Historia Zamówień</h2>
            {orders.length === 0 ? <p>Brak zamówień.</p> : orders.map(o => (
                <div key={o.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                        <div>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginRight: '1rem' }}>
                                {new Date(o.created_at).toLocaleString('pl-PL')}
                            </span>
                            <span style={{ fontWeight: 'bold' }}>{o.customer_details.name}</span>
                            <span style={{ margin: '0 0.5rem', color: 'var(--color-text-muted)' }}>|</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>{o.customer_details.email}</span>
                        </div>
                        <div>
                            <span style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '1.2rem' }}>{o.total_amount} PLN</span>
                            <span style={{ marginLeft: '1rem', background: 'green', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{o.status}</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Produkty:</h4>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                {o.items.map((item: any, idx: number) => (
                                    <li key={idx} style={{ marginBottom: '0.3rem' }}>
                                        {item.name} (x{item.quantity || 1}) - {item.price} PLN
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Adres:</h4>
                            <p style={{ lineHeight: '1.5', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                {o.customer_details.street} {o.customer_details.houseNumber}{o.customer_details.apartmentNumber ? '/' + o.customer_details.apartmentNumber : ''}<br />
                                {o.customer_details.zipCode} {o.customer_details.city}<br />
                                Tel: {o.customer_details.phone}
                            </p>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>ID: {o.payment_id}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderBlogTab = () => (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                {/* BLOG FORM */}
                <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", position: "sticky", top: "2rem" }}>

                    {/* AI GENERATOR SECTION (Reused logic) */}
                    <div style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid var(--color-border)" }}>
                        <h3 style={{ marginBottom: "1rem", color: "var(--color-primary)" }}>✨ Generator AI (Styl Dr. Marcina)</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <input
                                placeholder="Temat posta (np. Dlaczego warto leczyć kanałowo?)"
                                value={aiTopic}
                                onChange={(e) => setAiTopic(e.target.value)}
                                style={inputStyle}
                            />
                            <textarea
                                placeholder="Wskazówki (np. bądź zabawny, użyj porównania do motoryzacji)"
                                value={aiInstructions}
                                onChange={(e) => setAiInstructions(e.target.value)}
                                style={inputStyle}
                                rows={2}
                            />
                            <button
                                onClick={handleBlogAiGenerate}
                                disabled={isGenerating}
                                className="btn-primary"
                                style={{
                                    width: "100%",
                                    opacity: isGenerating ? 0.7 : 1,
                                    background: "linear-gradient(135deg, #dcb14a, #f0c96c)"
                                }}
                            >
                                {isGenerating ? "Generowanie (ok. 30-60s)..." : "Generuj Post na Bloga ✍️"}
                            </button>
                        </div>
                    </div>

                    <h2 style={{ marginBottom: "1rem" }}>{editingBlogPostId ? "Edytuj Post" : "Dodaj Post"}</h2>
                    <form onSubmit={handleSaveBlogPost} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <input required placeholder="Tytuł" value={blogFormData.title} onChange={(e) => setBlogFormData({ ...blogFormData, title: e.target.value })} style={inputStyle} />
                        <input placeholder="Slug (opcjonalny - wygeneruje się sam)" value={blogFormData.slug} onChange={(e) => setBlogFormData({ ...blogFormData, slug: e.target.value })} style={inputStyle} />
                        <input required type="date" value={blogFormData.date} onChange={(e) => setBlogFormData({ ...blogFormData, date: e.target.value })} style={inputStyle} />
                        <input placeholder="Tagi (oddzielone przecinkiem)" value={blogFormData.tags} onChange={(e) => setBlogFormData({ ...blogFormData, tags: e.target.value })} style={inputStyle} />
                        <textarea placeholder="Krótki wstęp (Excerpt)" rows={3} value={blogFormData.excerpt} onChange={(e) => setBlogFormData({ ...blogFormData, excerpt: e.target.value })} style={inputStyle} />
                        <textarea placeholder="Treść (HTML/Markdown)" rows={10} value={blogFormData.content} onChange={(e) => setBlogFormData({ ...blogFormData, content: e.target.value })} style={inputStyle} />
                        <input placeholder="Link do zdjęcia" value={blogFormData.image} onChange={(e) => setBlogFormData({ ...blogFormData, image: e.target.value })} style={inputStyle} />

                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingBlogPostId ? "Zapisz Zmiany" : "Dodaj Post"}</button>
                            {editingBlogPostId && <button type="button" onClick={resetBlogForm} style={{ padding: "1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", cursor: "pointer" }}>Anuluj</button>}
                        </div>
                    </form>
                </div>

                {/* BLOG LIST */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3 style={{ marginBottom: "1rem" }}>Lista Postów</h3>
                    {blogPosts.length === 0 ? <p>Brak postów.</p> : blogPosts.map(p => (
                        <div key={p.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{p.title}</h3>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{new Date(p.date).toLocaleDateString()}</span>
                            </div>
                            <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>/{p.slug}</p>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button onClick={() => handleEditBlogPost(p)} style={{ padding: "0.5rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer" }}>Edytuj</button>
                                <button onClick={() => handleDeleteBlogPost(p.id)} style={{ padding: "0.5rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń</button>
                                <a href={`/nowosielski/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: "0.5rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "4px", color: "white", textDecoration: "none", fontSize: "0.9rem" }}>Podgląd ↗</a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );

    const renderPatientsTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2>Pacjenci Strefy Pacjenta</h2>
            {patients.length === 0 ? <p>Brak zarejestrowanych pacjentów.</p> : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Imię i Nazwisko</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Email</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Telefon</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Status</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Data rejestracji</th>
                                <th style={{ padding: "1rem", textAlign: "left" }}>Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.map((patient) => {
                                // Status badge helper
                                const getStatusBadge = (status: string | null) => {
                                    let bgColor, textColor, label;
                                    if (status === 'pending_admin_approval') {
                                        bgColor = 'rgba(220, 177, 74, 0.2)';
                                        textColor = '#dcb14a';
                                        label = '⏳ Oczekuje';
                                    } else if (status === 'active') {
                                        bgColor = 'rgba(34, 197, 94, 0.2)';
                                        textColor = '#22c55e';
                                        label = '✓ Aktywny';
                                    } else if (status === 'rejected') {
                                        bgColor = 'rgba(239, 68, 68, 0.2)';
                                        textColor = '#ef4444';
                                        label = '✗ Odrzucony';
                                    } else if (status === 'pending_email_verification') {
                                        bgColor = 'rgba(156, 163, 175, 0.2)';
                                        textColor = '#9ca3af';
                                        label = '📧 Weryfikacja email';
                                    } else {
                                        bgColor = 'rgba(156, 163, 175, 0.2)';
                                        textColor = '#9ca3af';
                                        label = 'Nieznany';
                                    }
                                    return (
                                        <span style={{
                                            background: bgColor,
                                            color: textColor,
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '99px',
                                            fontWeight: 'bold',
                                            fontSize: '0.85rem',
                                            border: `1px solid ${textColor}40`
                                        }}>
                                            {label}
                                        </span>
                                    );
                                };

                                return (
                                    <tr key={patient.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                                        <td style={{ padding: "1rem" }}>
                                            <strong>{patient.firstName} {patient.lastName}</strong>
                                        </td>
                                        <td style={{ padding: "1rem" }}>{patient.email}</td>
                                        <td style={{ padding: "1rem" }}>{patient.phone}</td>
                                        <td style={{ padding: "1rem" }}>{getStatusBadge(patient.accountStatus)}</td>
                                        <td style={{ padding: "1rem" }}>
                                            {new Date(patient.createdAt).toLocaleDateString('pl-PL')}
                                        </td>
                                        <td style={{ padding: "1rem", display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {patient.accountStatus === 'pending_admin_approval' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApprovePatient(patient.id)}
                                                        style={{
                                                            padding: "0.5rem 1rem",
                                                            background: "linear-gradient(135deg, #22c55e, #16a34a)",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            color: "white",
                                                            cursor: "pointer",
                                                            fontWeight: "bold"
                                                        }}
                                                    >
                                                        ✓ Zatwierdź
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectPatient(patient.id)}
                                                        style={{
                                                            padding: "0.5rem 1rem",
                                                            background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            color: "white",
                                                            cursor: "pointer",
                                                            fontWeight: "bold"
                                                        }}
                                                    >
                                                        ✗ Odrzuć
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDeletePatient(patient.id)}
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    background: "var(--color-danger)",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    color: "white",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                🗑️ Usuń
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderRolesTab = () => {
        if (rolesLoading && rolesUsers.length === 0) {
            return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Ladowanie...</div>;
        }
        if (rolesError) {
            return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-error)' }}>{rolesError}</div>;
        }
        if (rolesUsers.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: 'var(--color-text-muted)' }}>Brak uzytkownikow</p>
                    <button onClick={fetchRoles} style={{
                        marginTop: '1rem', padding: '0.5rem 1.5rem',
                        background: 'var(--color-primary)', color: '#000',
                        border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                    }}>Zaladuj uprawnienia</button>
                </div>
            );
        }

        const roleDefs = [
            { key: 'admin', label: 'Admin', emoji: '🟢', color: '#22c55e' },
            { key: 'employee', label: 'Pracownik', emoji: '🔵', color: '#3b82f6' },
            { key: 'patient', label: 'Pacjent', emoji: '🟡', color: '#eab308' },
        ];

        return (
            <div>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        {rolesUsers.length} uzytkownikow w systemie
                    </p>
                    <button onClick={fetchRoles} style={{
                        padding: '0.4rem 1rem', background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)', borderRadius: '6px',
                        color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '0.85rem'
                    }}>Odswiez</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {rolesUsers.map((user: any) => (
                        <div key={user.user_id} style={{
                            background: 'var(--color-surface)',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            border: '1px solid var(--color-border)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--color-text-main)' }}>
                                        {user.email}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                                        ID: {user.user_id.slice(0, 8)}...
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    {user.roles.map((r: string) => {
                                        const rd = roleDefs.find(d => d.key === r);
                                        return rd ? (
                                            <span key={r} style={{
                                                background: rd.color + '22', color: rd.color,
                                                padding: '0.2rem 0.6rem', borderRadius: '12px',
                                                fontSize: '0.7rem', fontWeight: '600'
                                            }}>{rd.emoji} {rd.label}</span>
                                        ) : null;
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {roleDefs.map(rd => {
                                    const has = user.roles.includes(rd.key);
                                    return (
                                        <button
                                            key={rd.key}
                                            onClick={() => toggleRole(user.user_id, user.email, rd.key, has)}
                                            style={{
                                                padding: '0.4rem 0.9rem',
                                                background: has ? rd.color : 'transparent',
                                                color: has ? '#fff' : 'var(--color-text-muted)',
                                                border: `1px solid ${has ? rd.color : 'var(--color-border)'}`,
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: has ? 'bold' : 'normal',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {has ? `${rd.emoji} ${rd.label} ✓` : `+ ${rd.label}`}
                                        </button>
                                    );
                                })}
                            </div>

                            {user.roleDetails && user.roleDetails.length > 0 && (
                                <div style={{ marginTop: '0.6rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                    {user.roleDetails.map((rd: any, i: number) => (
                                        <span key={i} style={{ marginRight: '1rem' }}>
                                            {rd.role}: nadane przez {rd.granted_by || 'system'} ({new Date(rd.granted_at).toLocaleDateString('pl-PL')})
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => sendResetPassword(user.email)}
                                    style={{
                                        padding: '0.3rem 0.7rem',
                                        background: 'transparent',
                                        color: 'var(--color-text-muted)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.7rem',
                                    }}
                                >
                                    🔑 Reset hasła
                                </button>
                                {user.roles.length === 0 && (
                                    <button
                                        onClick={() => deleteUser(user.user_id, user.email)}
                                        style={{
                                            padding: '0.3rem 0.7rem',
                                            background: 'transparent',
                                            color: 'var(--color-error, #ef4444)',
                                            border: '1px solid var(--color-error, #ef4444)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        🗑️ Usuń konto
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Patient Candidates for Promotion */}
                {patientCandidates.length > 0 && (
                    <div style={{
                        marginTop: '2rem',
                        borderTop: '2px solid var(--color-primary)',
                        paddingTop: '1.5rem',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            marginBottom: '1rem'
                        }}>
                            <span style={{ fontSize: '1.3rem' }}>🔔</span>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Pacjenci do awansowania</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    Pacjenci zarejestrowani w Strefie Pacjenta, którzy nie mają jeszcze konta admin/pracownik
                                </p>
                            </div>
                            <span style={{
                                background: 'var(--color-primary)',
                                color: '#000',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                marginLeft: 'auto',
                            }}>{patientCandidates.length}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {patientCandidates.map((patient: any) => (
                                <div key={patient.id} style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '12px',
                                    padding: '1.25rem',
                                    border: '1px solid rgba(220, 177, 74, 0.3)',
                                    borderLeft: '4px solid var(--color-primary)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--color-text-main)' }}>
                                                {patient.email}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                <span>📞 {patient.phone || 'brak'}</span>
                                                <span>📅 {new Date(patient.createdAt).toLocaleDateString('pl-PL')}</span>
                                                <span style={{
                                                    color: patient.accountStatus === 'approved' ? '#22c55e' :
                                                        patient.accountStatus === 'pending' ? '#eab308' : '#ef4444',
                                                }}>● {patient.accountStatus || 'nieznany'}</span>
                                                {patient.emailVerified && <span style={{ color: '#22c55e' }}>✓ email zweryfikowany</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => promotePatient(patient.email, ['employee'])}
                                                disabled={promotingEmail === patient.email}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#3b82f6',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: promotingEmail === patient.email ? 'wait' : 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    opacity: promotingEmail === patient.email ? 0.5 : 1,
                                                }}
                                            >
                                                {promotingEmail === patient.email ? '⏳...' : '🔵 Pracownik'}
                                            </button>
                                            <button
                                                onClick={() => promotePatient(patient.email, ['admin'])}
                                                disabled={promotingEmail === patient.email}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: '#22c55e',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: promotingEmail === patient.email ? 'wait' : 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    opacity: promotingEmail === patient.email ? 0.5 : 1,
                                                }}
                                            >
                                                {promotingEmail === patient.email ? '⏳...' : '🟢 Admin'}
                                            </button>
                                            <button
                                                onClick={() => promotePatient(patient.email, ['employee', 'admin'])}
                                                disabled={promotingEmail === patient.email}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    background: 'linear-gradient(135deg, #3b82f6, #22c55e)',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: promotingEmail === patient.email ? 'wait' : 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    opacity: promotingEmail === patient.email ? 0.5 : 1,
                                                }}
                                            >
                                                {promotingEmail === patient.email ? '⏳...' : '🔵🟢 Oba'}
                                            </button>
                                            <button
                                                onClick={() => dismissPatient(patient.id, patient.email)}
                                                title="Ukryj z listy"
                                                style={{
                                                    padding: '0.5rem 0.7rem',
                                                    background: 'transparent',
                                                    color: 'var(--color-text-muted)',
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    lineHeight: 1,
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#ef444422'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        );
    };

    const renderSmsRemindersTab = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Header with stats */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                <div>
                    <h2 style={{ margin: 0, marginBottom: "0.5rem" }}>📱 SMS Przypomnienia</h2>
                    <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                        Zarządzaj automatycznymi SMS przed wysyłką
                    </p>
                </div>
                <div style={{ display: "flex", gap: "2rem", fontSize: "0.9rem" }}>
                    <div>
                        <span style={{ color: "var(--color-text-muted)" }}>Szkice: </span>
                        <strong style={{ color: "var(--color-primary)", fontSize: "1.2rem" }}>{smsStats.draft}</strong>
                    </div>
                    <div>
                        <span style={{ color: "var(--color-text-muted)" }}>Wysłane: </span>
                        <strong>{smsStats.sent}</strong>
                    </div>
                    <div>
                        <span style={{ color: "var(--color-text-muted)" }}>Błędy: </span>
                        <strong>{smsStats.failed}</strong>
                    </div>
                </div>
            </div>


            {/* Manual Trigger Button */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <button
                    onClick={handleManualGenerate}
                    disabled={!!manualGenerationStatus}
                    className="btn-secondary"
                    style={{
                        flex: 1,
                        padding: "1rem",
                        background: manualGenerationStatus ? "#666" : "rgba(255, 255, 255, 0.05)",
                        border: "2px solid var(--color-primary)",
                        fontSize: "1rem",
                        fontWeight: "600",
                        minWidth: "200px"
                    }}
                >
                    {manualGenerationStatus ? "⏳ Generuję..." : "🔄 Wywołaj Cron (Generuj SMS na jutro)"}
                </button>

                {manualGenerationStatus && (
                    <div style={{
                        width: "100%",
                        padding: "1rem",
                        background: "var(--color-surface)",
                        borderRadius: "var(--radius-md)",
                        whiteSpace: "pre-line",
                        fontFamily: "monospace",
                        fontSize: "0.9rem"
                    }}>
                        {manualGenerationStatus}
                    </div>
                )}
            </div>

            {/* Send All Button */}
            {smsStats.draft > 0 && (
                <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                        onClick={handleSendAllSms}
                        disabled={sendingAll}
                        className="btn-primary"
                        style={{
                            flex: 1,
                            padding: "1rem",
                            background: sendingAll ? "#666" : "linear-gradient(135deg, #dcb14a, #f0c96c)",
                            fontSize: "1.1rem",
                            fontWeight: "bold"
                        }}
                    >
                        {sendingAll ? "Wysyłanie..." : `📤 Wyślij Wszystkie (${smsStats.draft})`}
                    </button>
                    <button
                        onClick={handleDeleteAllDrafts}
                        style={{
                            padding: "1rem 1.5rem",
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "2px solid #ef4444",
                            borderRadius: "var(--radius-md)",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "1rem"
                        }}
                    >
                        🗑️ Usuń wszystkie szkice
                    </button>
                </div>
            )}

            {/* SMS Tabs */}
            <div style={{ display: "flex", gap: "0", borderBottom: "2px solid var(--color-border)", marginBottom: "1.5rem" }}>
                {(['drafts', 'sent', 'manual'] as const).map(tab => {
                    const labels = {
                        drafts: `📝 Szkice (${smsStats.draft})`,
                        sent: `📤 Wysłane (${smsStats.sent})`,
                        manual: '✉️ Wyślij SMS ręcznie'
                    };
                    return (
                        <button
                            key={tab}
                            onClick={() => setSmsTab(tab)}
                            style={{
                                padding: "0.75rem 1.5rem",
                                background: "none",
                                border: "none",
                                borderBottom: smsTab === tab ? "3px solid var(--color-primary)" : "3px solid transparent",
                                color: smsTab === tab ? "var(--color-primary)" : "var(--color-text-muted)",
                                fontWeight: smsTab === tab ? "bold" : "normal",
                                fontSize: "0.95rem",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {labels[tab]}
                        </button>
                    );
                })}
            </div>

            {/* Template Editor Toggle */}
            <button
                onClick={() => {
                    setShowTemplateEditor(!showTemplateEditor);
                    if (!showTemplateEditor && smsTemplates.length === 0) {
                        fetch('/api/admin/sms-templates')
                            .then(r => r.json())
                            .then(d => setSmsTemplates(d.templates || []))
                            .catch(() => { });
                    }
                }}
                style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: showTemplateEditor ? "rgba(220, 177, 74, 0.15)" : "var(--color-surface)",
                    border: showTemplateEditor ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    color: showTemplateEditor ? "var(--color-primary)" : "var(--color-text-muted)",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.95rem",
                    textAlign: "left",
                    marginBottom: "1rem"
                }}
            >
                {showTemplateEditor ? '▼' : '▶'} 📝 Szablony SMS (kliknij aby {showTemplateEditor ? 'schować' : 'edytować'})
            </button>

            {/* Template Editor */}
            {showTemplateEditor && (
                <div style={{
                    background: "var(--color-surface)",
                    padding: "1.5rem",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "1.5rem",
                    border: "1px solid rgba(220, 177, 74, 0.2)"
                }}>
                    <div style={{ marginBottom: "1rem" }}>
                        <h3 style={{ margin: 0, marginBottom: "0.5rem" }}>📝 Szablony treści SMS</h3>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                            Placeholders: <code>{'{time}'}</code> = godzina, <code>{'{doctor}'}</code> = lekarz, <code>{'{patientName}'}</code> = imię, <code>{'{date}'}</code> = data, <code>{'{appointmentType}'}</code> = typ
                        </p>
                    </div>

                    {smsTemplates.length === 0 ? (
                        <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "1rem" }}>Ładowanie szablonów...</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {smsTemplates.map(tmpl => {
                                const isEditing = editingTemplateId === tmpl.id;
                                return (
                                    <div key={tmpl.id} style={{
                                        padding: "1rem",
                                        background: "var(--color-background)",
                                        borderRadius: "6px",
                                        border: isEditing ? "2px solid var(--color-primary)" : "1px solid var(--color-border)"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                            <strong style={{ fontSize: "0.9rem" }}>
                                                {tmpl.label || tmpl.key}
                                            </strong>
                                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                                                {tmpl.key}
                                            </span>
                                        </div>

                                        {isEditing ? (
                                            <div>
                                                <textarea
                                                    value={editingTemplateText}
                                                    onChange={(e) => setEditingTemplateText(e.target.value)}
                                                    style={{
                                                        width: "100%",
                                                        minHeight: "70px",
                                                        padding: "0.8rem",
                                                        borderRadius: "4px",
                                                        border: "1px solid var(--color-border)",
                                                        background: "var(--color-surface)",
                                                        color: "var(--color-text-main)",
                                                        fontSize: "0.9rem",
                                                        fontFamily: "inherit",
                                                        resize: "vertical"
                                                    }}
                                                />
                                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                                    <button
                                                        onClick={async () => {
                                                            const res = await fetch('/api/admin/sms-templates', {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ id: tmpl.id, template: editingTemplateText })
                                                            });
                                                            if (res.ok) {
                                                                setSmsTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, template: editingTemplateText } : t));
                                                                setEditingTemplateId(null);
                                                                setEditingTemplateText('');
                                                            } else {
                                                                alert('Błąd zapisu szablonu');
                                                            }
                                                        }}
                                                        style={{
                                                            padding: "0.4rem 1rem",
                                                            background: "var(--color-primary)",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            color: "black",
                                                            cursor: "pointer",
                                                            fontWeight: "bold",
                                                            fontSize: "0.85rem"
                                                        }}
                                                    >
                                                        💾 Zapisz
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingTemplateId(null); setEditingTemplateText(''); }}
                                                        style={{
                                                            padding: "0.4rem 1rem",
                                                            background: "var(--color-surface-hover)",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            color: "#fff",
                                                            cursor: "pointer",
                                                            fontSize: "0.85rem"
                                                        }}
                                                    >
                                                        Anuluj
                                                    </button>
                                                </div>
                                                <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                    {editingTemplateText.length} znaków
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => { setEditingTemplateId(tmpl.id); setEditingTemplateText(tmpl.template); }}
                                                style={{
                                                    padding: "0.5rem",
                                                    fontSize: "0.85rem",
                                                    color: "var(--color-text-muted)",
                                                    cursor: "pointer",
                                                    borderRadius: "4px",
                                                    transition: "background 0.2s"
                                                }}
                                                title="Kliknij aby edytować"
                                            >
                                                {tmpl.template}
                                                <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", opacity: 0.6 }}>✏️</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ DRAFTS TAB ═══ */}
            {smsTab === 'drafts' && (
                <>
                    {smsReminders.filter(sms => sms.status === 'draft').length === 0 ? (
                        <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>Brak szkiców SMS</p>
                    ) : (
                        smsReminders.filter(sms => sms.status === 'draft').map(sms => {
                            const isEditing = editingSmsId === sms.id;
                            const timeMatch = sms.sms_message?.match(/(\d{1,2}):(\d{2})/);
                            const appointmentTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : new Date(sms.appointment_date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                            const appointmentDate = new Date(sms.appointment_date).toLocaleDateString('pl-PL', { timeZone: 'UTC' });

                            return (
                                <div key={sms.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                                        <div>
                                            <strong style={{ fontSize: "1.1rem" }}>{sms.patient_name || sms.phone}</strong>
                                            <div style={{ marginTop: "0.25rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>📞 {sms.phone} • 🦷 {sms.appointment_type}</div>
                                            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>📅 {appointmentDate} • ⏰ {appointmentTime} • 👨‍⚕️ {sms.doctor_name}</span>
                                        </div>
                                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", background: '#ffc107', color: 'white' }}>draft</span>
                                    </div>

                                    {isEditing ? (
                                        <div style={{ marginBottom: "1rem" }}>
                                            <textarea value={editingSmsMessage} onChange={(e) => setEditingSmsMessage(e.target.value)} style={{ width: "100%", minHeight: "80px", padding: "0.8rem", borderRadius: "4px", border: "1px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-text-main)", fontSize: "0.9rem", fontFamily: "inherit" }} />
                                            <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{editingSmsMessage.length} znaków • {Math.ceil(editingSmsMessage.length / 160)} SMS</div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: "1rem", background: "var(--color-background)", borderRadius: "4px", marginBottom: "1rem", fontSize: "0.9rem", lineHeight: "1.6" }}>
                                            {sms.sms_message}
                                            <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{sms.sms_message.length} znaków • {Math.ceil(sms.sms_message.length / 160)} SMS</div>
                                        </div>
                                    )}

                                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                        {isEditing ? (
                                            <>
                                                <button onClick={() => handleEditSms(sms.id, editingSmsMessage)} style={{ padding: "0.5rem 1rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer", fontWeight: "bold" }}>💾 Zapisz</button>
                                                <button onClick={() => { setEditingSmsId(null); setEditingSmsMessage(''); }} style={{ padding: "0.5rem 1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer" }}>Anuluj</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditingSmsId(sms.id); setEditingSmsMessage(sms.sms_message); }} style={{ padding: "0.5rem 1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer" }}>✏️ Edytuj</button>
                                                <button onClick={() => handleSendSingleSms(sms.id)} style={{ padding: "0.5rem 1rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer", fontWeight: "bold" }}>📱 Wyślij</button>
                                                <button onClick={() => handleDeleteSms(sms.id)} style={{ padding: "0.5rem 1rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>🗑️ Usuń</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* ═══ SKIPPED PATIENTS ═══ */}
                    {skippedPatients.length > 0 && (
                        <div style={{
                            marginTop: "1.5rem",
                            padding: "1.25rem",
                            background: "rgba(255, 193, 7, 0.08)",
                            border: "2px solid rgba(255, 193, 7, 0.3)",
                            borderRadius: "var(--radius-md)"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                                <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                                <strong style={{ fontSize: "1rem", color: "#ffc107" }}>Pominięci pacjenci ({skippedPatients.length})</strong>
                                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>— w godzinach pracy, ale bez SMS</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                                {skippedPatients.map((sp, idx) => (
                                    <div key={idx} style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "0.75rem 1rem",
                                        background: "var(--color-surface)",
                                        borderRadius: "6px",
                                        gap: "1rem",
                                        flexWrap: "wrap"
                                    }}>
                                        <div style={{ flex: 1, minWidth: "200px" }}>
                                            <strong style={{ fontSize: "0.95rem" }}>{sp.patientName}</strong>
                                            <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                                                ⏰ {sp.appointmentTime} • 👨‍⚕️ {sp.doctorName} • 🦷 {sp.appointmentType}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                                            <span style={{
                                                padding: "0.25rem 0.6rem",
                                                background: "rgba(255, 193, 7, 0.15)",
                                                color: "#ffc107",
                                                borderRadius: "4px",
                                                fontSize: "0.78rem",
                                                fontWeight: "600",
                                                whiteSpace: "nowrap"
                                            }}>
                                                {sp.reason}
                                            </span>
                                            {sp.reason.includes('telefonu') && (
                                                <button
                                                    onClick={() => {
                                                        setSmsTab('manual');
                                                        setPatientSearchQuery(sp.patientName);
                                                    }}
                                                    style={{
                                                        padding: "0.35rem 0.75rem",
                                                        background: "var(--color-primary)",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        color: "black",
                                                        cursor: "pointer",
                                                        fontWeight: "600",
                                                        fontSize: "0.8rem",
                                                        whiteSpace: "nowrap"
                                                    }}
                                                >
                                                    ✉️ Wyślij ręcznie
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ═══ SENT TAB — Grouped by Date ═══ */}
            {smsTab === 'sent' && (() => {
                const sentSms = smsReminders.filter(sms => sms.status === 'sent' || sms.status === 'failed');

                // Group by appointment date
                const grouped: Record<string, any[]> = {};
                sentSms.forEach(sms => {
                    const dateKey = new Date(sms.sent_at || sms.appointment_date).toLocaleDateString('pl-PL', { timeZone: 'UTC' });
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(sms);
                });

                // Sort dates newest first
                const sortedDates = Object.keys(grouped).sort((a, b) => {
                    const [da, ma, ya] = a.split('.').map(Number);
                    const [db, mb, yb] = b.split('.').map(Number);
                    return (yb * 10000 + mb * 100 + db) - (ya * 10000 + ma * 100 + da);
                });

                // Filter by selected date
                const visibleDates = sentDateFilter
                    ? sortedDates.filter(d => d === sentDateFilter)
                    : sortedDates;

                return (
                    <>
                        {/* Date Filter */}
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
                            <label style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", fontWeight: "600" }}>📅 Filtruj po dacie:</label>
                            <select
                                value={sentDateFilter}
                                onChange={(e) => setSentDateFilter(e.target.value)}
                                style={{
                                    padding: "0.5rem 1rem",
                                    borderRadius: "6px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-surface)",
                                    color: "var(--color-text-main)",
                                    fontSize: "0.9rem",
                                    cursor: "pointer"
                                }}
                            >
                                <option value="">Wszystkie daty ({sentSms.length})</option>
                                {sortedDates.map(date => (
                                    <option key={date} value={date}>{date} ({grouped[date].length} SMS)</option>
                                ))}
                            </select>
                            {sentDateFilter && (
                                <button
                                    onClick={() => setSentDateFilter('')}
                                    style={{ padding: "0.4rem 0.8rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer", fontSize: "0.85rem" }}
                                >✕ Pokaż wszystkie</button>
                            )}
                        </div>

                        {visibleDates.length === 0 ? (
                            <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>Brak wysłanych SMS</p>
                        ) : (
                            visibleDates.map(dateKey => (
                                <div key={dateKey} style={{ marginBottom: "1.5rem" }}>
                                    {/* Date group header */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.75rem",
                                        marginBottom: "0.75rem",
                                        padding: "0.6rem 1rem",
                                        background: "rgba(220, 177, 74, 0.08)",
                                        borderRadius: "6px",
                                        borderLeft: "3px solid var(--color-primary)"
                                    }}>
                                        <span style={{ fontSize: "1rem" }}>📅</span>
                                        <strong style={{ fontSize: "0.95rem", color: "var(--color-primary)" }}>{dateKey}</strong>
                                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>({grouped[dateKey].length} SMS)</span>
                                    </div>

                                    {/* SMS cards for this date */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingLeft: "0.5rem" }}>
                                        {grouped[dateKey].map(sms => {
                                            const timeMatch = sms.sms_message?.match(/(\d{1,2}):(\d{2})/);
                                            const appointmentTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '';

                                            return (
                                                <div key={sms.id} style={{
                                                    background: "var(--color-surface)",
                                                    padding: "1.25rem",
                                                    borderRadius: "var(--radius-md)",
                                                    border: sms.status === 'failed' ? '2px solid var(--color-error)' : undefined
                                                }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                                                        <div>
                                                            <strong>{sms.patient_name || sms.phone}</strong>
                                                            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                                                                📞 {sms.phone} {appointmentTime && `• ⏰ ${appointmentTime}`} • 👨‍⚕️ {sms.doctor_name}
                                                            </div>
                                                        </div>
                                                        <span style={{
                                                            padding: "0.2rem 0.5rem",
                                                            borderRadius: "4px",
                                                            fontSize: "0.75rem",
                                                            background: sms.status === 'sent' ? '#4caf50' : '#f44336',
                                                            color: 'white',
                                                            alignSelf: 'flex-start'
                                                        }}>{sms.status}</span>
                                                    </div>

                                                    <div style={{ padding: "0.75rem", background: "var(--color-background)", borderRadius: "4px", marginBottom: "0.75rem", fontSize: "0.88rem", lineHeight: "1.6" }}>
                                                        {sms.sms_message}
                                                    </div>

                                                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                                                        <button
                                                            onClick={() => handleResendSms(sms)}
                                                            style={{ padding: "0.4rem 0.9rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}
                                                        >🔄 Wyślij ponownie</button>
                                                        <button
                                                            onClick={() => handleDeleteSms(sms.id)}
                                                            style={{ padding: "0.4rem 0.9rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer", fontSize: "0.85rem" }}
                                                        >🗑️ Usuń</button>
                                                        {sms.status === 'failed' && sms.send_error && (
                                                            <div style={{ flex: 1, padding: "0.4rem 0.6rem", background: "#fff3cd", color: "#856404", borderRadius: "4px", fontSize: "0.8rem" }}>❌ {sms.send_error}</div>
                                                        )}
                                                        {sms.sent_at && (
                                                            <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginLeft: "auto" }}>
                                                                Wysłano: {new Date(sms.sent_at).toLocaleString('pl-PL', { timeZone: 'UTC' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                );
            })()}

            {/* ═══ MANUAL SMS TAB ═══ */}
            {smsTab === 'manual' && (
                <div style={{ maxWidth: "600px" }}>
                    <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>✉️ Wyślij SMS ręcznie</h3>
                        <p style={{ margin: "0 0 1.5rem", fontSize: "0.88rem", color: "var(--color-text-muted)" }}>Wyszukaj pacjenta po nazwisku, system automatycznie uzupełni numer telefonu.</p>

                        {/* Patient search */}
                        <div style={{ marginBottom: "1.25rem", position: "relative" }}>
                            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", fontWeight: "600" }}>🔍 Wyszukaj pacjenta</label>
                            <input
                                type="text"
                                value={patientSearchQuery}
                                onChange={(e) => handleSearchPatients(e.target.value)}
                                placeholder="Wpisz imię lub nazwisko..."
                                style={{
                                    width: "100%",
                                    padding: "0.7rem 1rem",
                                    borderRadius: "6px",
                                    border: "2px solid var(--color-border)",
                                    background: "var(--color-background)",
                                    color: "var(--color-text-main)",
                                    fontSize: "0.95rem",
                                    fontFamily: "inherit"
                                }}
                            />
                            {searchingPatients && (
                                <div style={{ position: "absolute", right: "12px", top: "36px", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Szukam...</div>
                            )}

                            {/* Search results dropdown */}
                            {patientSearchResults.length > 0 && (
                                <div style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "0 0 8px 8px",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                                    zIndex: 100,
                                    maxHeight: "200px",
                                    overflowY: "auto"
                                }}>
                                    {patientSearchResults.map((patient, idx) => (
                                        <div
                                            key={patient.id || idx}
                                            onClick={() => handleSelectPatient(patient)}
                                            style={{
                                                padding: "0.65rem 1rem",
                                                cursor: "pointer",
                                                borderBottom: "1px solid var(--color-border)",
                                                transition: "background 0.15s",
                                                fontSize: "0.9rem"
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220, 177, 74, 0.1)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <strong>{patient.firstName} {patient.lastName}</strong>
                                            <span style={{ marginLeft: "0.75rem", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>📞 {patient.phone || 'brak numeru'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Patient name (auto-filled or manual) */}
                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", fontWeight: "600" }}>👤 Imię i nazwisko</label>
                            <input
                                type="text"
                                value={manualPatientName}
                                onChange={(e) => setManualPatientName(e.target.value)}
                                placeholder="Jan Kowalski"
                                style={{
                                    width: "100%",
                                    padding: "0.7rem 1rem",
                                    borderRadius: "6px",
                                    border: "2px solid var(--color-border)",
                                    background: manualPatientName ? "rgba(220, 177, 74, 0.05)" : "var(--color-background)",
                                    color: "var(--color-text-main)",
                                    fontSize: "0.95rem",
                                    fontFamily: "inherit"
                                }}
                            />
                        </div>

                        {/* Phone (auto-filled or manual) */}
                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", fontWeight: "600" }}>📞 Numer telefonu</label>
                            <input
                                type="text"
                                value={manualPhone}
                                onChange={(e) => setManualPhone(e.target.value)}
                                placeholder="48123456789"
                                style={{
                                    width: "100%",
                                    padding: "0.7rem 1rem",
                                    borderRadius: "6px",
                                    border: `2px solid ${manualPhone ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    background: manualPhone ? "rgba(220, 177, 74, 0.05)" : "var(--color-background)",
                                    color: "var(--color-text-main)",
                                    fontSize: "0.95rem",
                                    fontFamily: "inherit"
                                }}
                            />
                            <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Format: 48XXXXXXXXX (bez + i spacji)</div>
                        </div>

                        {/* Message */}
                        <div style={{ marginBottom: "1.25rem" }}>
                            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", fontWeight: "600" }}>💬 Treść SMS</label>
                            <textarea
                                value={manualMessage}
                                onChange={(e) => setManualMessage(e.target.value)}
                                placeholder="Wpisz treść wiadomości SMS..."
                                rows={4}
                                style={{
                                    width: "100%",
                                    padding: "0.7rem 1rem",
                                    borderRadius: "6px",
                                    border: "2px solid var(--color-border)",
                                    background: "var(--color-background)",
                                    color: "var(--color-text-main)",
                                    fontSize: "0.95rem",
                                    fontFamily: "inherit",
                                    resize: "vertical",
                                    lineHeight: "1.5"
                                }}
                            />
                            <div style={{ marginTop: "0.3rem", fontSize: "0.8rem", color: manualMessage.length > 160 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                                {manualMessage.length} / 160 znaków {manualMessage.length > 160 && `(${Math.ceil(manualMessage.length / 160)} SMS)`}
                            </div>
                        </div>

                        {/* Send button */}
                        <button
                            onClick={handleSendManualSms}
                            disabled={sendingManual || !manualPhone || !manualMessage}
                            style={{
                                width: "100%",
                                padding: "0.85rem",
                                background: (!manualPhone || !manualMessage) ? "#666" : "var(--color-primary)",
                                border: "none",
                                borderRadius: "8px",
                                color: "#1a1a1a",
                                fontWeight: "700",
                                fontSize: "1rem",
                                cursor: (!manualPhone || !manualMessage) ? "not-allowed" : "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {sendingManual ? '⏳ Wysyłanie...' : '📱 Wyślij SMS'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );


    const NavItem = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
                width: "100%",
                padding: "0.8rem 1rem",
                background: activeTab === id ? "var(--color-primary)" : "transparent",
                color: activeTab === id ? "black" : "var(--color-text-muted)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "all 0.2s",
                fontWeight: activeTab === id ? "bold" : "normal",
                textAlign: "left"
            }}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", flexDirection: "column" }}>

            {/* MOBILE HEADER */}
            <div style={{
                display: isMobile ? "flex" : "none",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem",
                background: "#111",
                borderBottom: "1px solid var(--color-surface-hover)",
                position: "sticky",
                top: 0,
                zIndex: 50
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "white" }}>
                    <span style={{ color: "var(--color-primary)" }}>❖</span>
                    <span style={{ fontWeight: "bold" }}>Mikrostomart Admin</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* SIDEBAR OVERLAY (Mobile only) */}
            {isMobile && isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 40
                    }}
                />
            )}

            {/* SIDEBAR */}
            <aside style={{
                width: "260px",
                background: "#111",
                borderRight: "1px solid var(--color-surface-hover)",
                padding: "2rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                position: "fixed",
                top: 0,
                bottom: 0,
                left: 0,
                height: "100vh",
                overflowY: "auto",
                zIndex: 50,
                transform: isMobile ? (isMobileMenuOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
                transition: "transform 0.3s ease-in-out"
            }}>
                <div style={{ marginBottom: "3rem", paddingLeft: "0.5rem" }}>
                    <h2 style={{ fontSize: "1.2rem", color: "white", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "var(--color-primary)" }}>❖</span> Mikrostomart
                    </h2>
                    <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>Panel Administratora v2.0</p>
                </div>

                <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                    <NavItem id="dashboard" label="Pulpit" icon={LayoutDashboard} />
                    <NavItem id="reservations" label="Rezerwacje" icon={Calendar} />
                    <NavItem id="patients" label="Pacjenci" icon={Users} />
                    <NavItem id="sms-reminders" label={
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" }}>
                            <span>SMS</span>
                            {smsStats.draft > 0 && (
                                <span style={{
                                    background: "#ff4444",
                                    color: "white",
                                    borderRadius: "50%",
                                    width: "20px",
                                    height: "20px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.7rem",
                                    fontWeight: "bold"
                                }}>
                                    {smsStats.draft}
                                </span>
                            )}
                        </div>
                    } icon={MessageCircle} />
                    <NavItem id="appointment-instructions" label="Instrukcje Wizyt" icon={FileText} />
                    <NavItem id="employees" label="Pracownicy" icon={Users} />
                    <NavItem id="roles" label="Uprawnienia" icon={Shield} />
                    <NavItem id="orders" label="Zamówienia" icon={ShoppingBag} />
                    <NavItem id="products" label="Produkty (Sklep)" icon={Package} />

                    <div style={{ height: "1px", background: "var(--color-surface-hover)", margin: "1rem 0" }} />

                    <NavItem id="news" label="Aktualności" icon={Newspaper} />
                    <NavItem id="articles" label="Baza Wiedzy" icon={BookOpen} />
                    <NavItem id="blog" label="Blog" icon={FileText} />
                    <NavItem id="questions" label="Pytania Eksperta" icon={HelpCircle} />
                </nav>

                <div style={{ marginTop: "auto", borderTop: "1px solid var(--color-surface-hover)", paddingTop: "1rem" }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.8rem",
                            width: "100%",
                            padding: "0.8rem 1rem",
                            background: "rgba(220, 38, 38, 0.1)",
                            color: "#ef4444",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        <LogOut size={18} />
                        Wyloguj
                    </button>
                    <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "1rem" }}>
                        Zalogowany jako Admin
                    </p>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main style={{
                flex: 1,
                marginLeft: isMobile ? 0 : "260px",
                padding: isMobile ? "1.5rem" : "3rem",
                background: "#0a0a0a",
                minHeight: "100vh"
            }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h1 style={{ fontSize: "1.8rem" }}>
                            {activeTab === 'dashboard' && 'Pulpit'}
                            {activeTab === 'reservations' && 'Rezerwacje Wizyt'}
                            {activeTab === 'patients' && 'Pacjenci Strefy Pacjenta'}
                            {activeTab === 'sms-reminders' && 'SMS Przypomnienia'}
                            {activeTab === 'appointment-instructions' && 'Instrukcje Wizyt'}
                            {activeTab === 'orders' && 'Zamówienia Sklepu'}
                            {activeTab === 'products' && 'Zarządzanie Produktami'}
                            {activeTab === 'news' && 'Aktualności'}
                            {activeTab === 'articles' && 'Baza Wiedzy'}
                            {activeTab === 'blog' && 'Blog (Dr. Marcin Nowosielski)'}
                            {activeTab === 'questions' && 'Pytania do Eksperta'}
                            {activeTab === 'employees' && 'Pracownicy — Zarządzanie Kontami'}
                            {activeTab === 'roles' && 'Uprawnienia — Zarządzanie Rolami'}
                        </h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            {/* Header Actions if needed */}
                        </div>
                    </header>


                    {activeTab === 'dashboard' && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
                            <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                                <h3 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Dzisiejsze Wizyty</h3>
                                <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--color-primary)" }}>
                                    {reservations.filter(r => r.date === new Date().toISOString().split('T')[0]).length}
                                </p>
                            </div>
                            <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                                <h3 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Nowe Zamówienia</h3>
                                <p style={{ fontSize: "2rem", fontWeight: "bold", color: "white" }}>
                                    {orders.length}
                                </p>
                            </div>
                            <div style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-surface-hover)" }}>
                                <h3 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>Pytania do Eksperta</h3>
                                <p style={{ fontSize: "2rem", fontWeight: "bold", color: questions.some(q => q.status === 'pending') ? "var(--color-error)" : "white" }}>
                                    {questions.filter(q => q.status === 'pending').length}
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reservations' && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <h2>Umówione Wizyty</h2>
                            {reservations.length === 0 ? <p>Brak rezerwacji.</p> : (
                                <div style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-lg)", overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", color: "white" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "1px solid var(--color-surface-hover)", textAlign: "left" }}>
                                                <th style={{ padding: "1rem" }}>Data/Godzina</th>
                                                <th style={{ padding: "1rem" }}>Pacjent</th>
                                                <th style={{ padding: "1rem" }}>Zgłoszenie</th>
                                                <th style={{ padding: "1rem" }}>Kontakt</th>
                                                <th style={{ padding: "1rem" }}>Akcje</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reservations.map((res: any) => (
                                                <tr key={res.id} style={{ borderBottom: "1px solid var(--color-surface-hover)" }}>
                                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                                        <div>{res.date}</div>
                                                        <div style={{ color: "var(--color-primary)", fontWeight: "bold" }}>{res.time}</div>
                                                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{new Date(res.created_at).toLocaleDateString()}</div>
                                                    </td>
                                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                                        <b>{res.name}</b>
                                                        <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                                                            {res.service}<br />
                                                            ({res.specialist})
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "1rem", verticalAlign: 'top', maxWidth: '300px' }}>
                                                        {res.description && (
                                                            <div style={{ fontStyle: "italic", marginBottom: "0.5rem" }}>
                                                                "{res.description}"
                                                            </div>
                                                        )}
                                                        {res.has_attachment && (
                                                            <span style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "0.3rem",
                                                                background: "rgba(59, 130, 246, 0.2)",
                                                                color: "#60a5fa",
                                                                padding: "0.2rem 0.6rem",
                                                                borderRadius: "99px",
                                                                fontSize: "0.8rem",
                                                                border: "1px solid rgba(59, 130, 246, 0.3)"
                                                            }}>
                                                                📎 Zdjęcie (w emailu)
                                                            </span>
                                                        )}
                                                        {!res.description && !res.has_attachment && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>- brak opisu -</span>}
                                                    </td>
                                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                                        <div>{res.phone}</div>
                                                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>{res.email}</div>
                                                    </td>
                                                    <td style={{ padding: "1rem", verticalAlign: 'top' }}>
                                                        <button
                                                            onClick={() => handleDeleteReservation(res.id)}
                                                            style={{ background: "var(--color-error)", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer" }}
                                                        >
                                                            Usuń
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
                            {/* PRODUCT FORM & LIST (Exact same as before) */}
                            <div style={{ background: "var(--color-surface)", padding: "2rem", borderRadius: "var(--radius-lg)", position: "sticky", top: "2rem" }}>
                                <h2 style={{ marginBottom: "1rem" }}>{editingId ? "Edytuj Produkt" : "Dodaj Produkt"}</h2>
                                <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    {/* ... inputs ... use existing logic */}
                                    <input required placeholder="Nazwa" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
                                    <input required type="number" placeholder="Cena (PLN)" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })} style={inputStyle} />
                                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={inputStyle}>
                                        <option value="Higiena">Higiena</option>
                                        <option value="Wybielanie">Wybielanie</option>
                                        <option value="Usługi">Usługi</option>
                                        <option value="Elektronika">Elektronika</option>
                                        <option value="Inne">Inne</option>
                                    </select>
                                    <textarea required placeholder="Opis" rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={inputStyle} />
                                    <input placeholder="Link do zdjęcia / Base64" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} style={inputStyle} />
                                    <textarea placeholder="Galeria (linki oddzielone przecinkiem)" rows={2} value={formData.gallery} onChange={(e) => setFormData({ ...formData, gallery: e.target.value })} style={inputStyle} />
                                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                        <input type="checkbox" checked={formData.isVisible} onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })} />
                                        <span>Widoczny w sklepie</span>
                                    </label>
                                    {error && <p style={{ color: "var(--color-error)" }}>{error}</p>}
                                    <div style={{ display: "flex", gap: "1rem" }}>
                                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingId ? "Zapisz Zmiany" : "Dodaj"}</button>
                                        {editingId && <button type="button" onClick={resetForm} style={{ padding: "1rem", background: "var(--color-surface-hover)", border: "none", borderRadius: "var(--radius-md)", color: "#fff", cursor: "pointer" }}>Anuluj</button>}
                                    </div>
                                </form>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                {loading ? <p>Ładowanie...</p> : products.map(product => (
                                    <div key={product.id} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <h3 style={{ fontSize: "1.1rem" }}>{product.name} {product.isVisible === false && <span style={{ color: "var(--color-error)", fontSize: "0.8rem" }}>(Ukryty)</span>}</h3>
                                            <p style={{ color: "var(--color-primary)", fontWeight: "bold" }}>{product.price} PLN</p>
                                        </div>
                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                            <button onClick={() => handleEdit(product)} style={{ padding: "0.5rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer" }}>Edytuj</button>
                                            <button onClick={() => handleDelete(product.id)} style={{ padding: "0.5rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'questions' && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <h2>Nadesłane Pytania (Zapytaj Eksperta)</h2>
                            {questions.length === 0 ? <p>Brak pytań.</p> : questions.map(q => (
                                <div key={q.id} style={{ background: "var(--color-surface)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{new Date(q.created_at).toLocaleDateString()}</span>
                                        <span style={{ background: q.status === 'pending' ? '#dcb14a' : 'green', color: 'black', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{q.status}</span>
                                    </div>
                                    <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>{q.question}</p>
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                        {generationStatus[q.id] ? (
                                            <span style={{ fontSize: "0.9rem", color: "var(--color-primary)", fontWeight: "bold" }}>
                                                {generationStatus[q.id]}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={async () => {
                                                    if (!confirm("Wygenerować artykuł?")) return;
                                                    setGenerationStatus(prev => ({ ...prev, [q.id]: "Start..." }));

                                                    try {
                                                        const res = await fetch("/api/cron/daily-article"); // No custom headers

                                                        if (!res.body) throw new Error("Brak strumienia");
                                                        const reader = res.body.getReader();
                                                        const decoder = new TextDecoder();

                                                        while (true) {
                                                            const { done, value } = await reader.read();
                                                            if (done) break;

                                                            const text = decoder.decode(value);
                                                            const lines = text.split("\n");

                                                            for (const line of lines) {
                                                                if (line.startsWith("STEP:")) {
                                                                    setGenerationStatus(prev => ({ ...prev, [q.id]: line.replace("STEP:", "").trim() }));
                                                                } else if (line.startsWith("SUCCESS:")) {
                                                                    const data = JSON.parse(line.replace("SUCCESS:", ""));
                                                                    alert(`Sukces! Utworzono: ${data.title}`);
                                                                    setGenerationStatus(prev => ({ ...prev, [q.id]: undefined }));
                                                                    fetchQuestions();
                                                                } else if (line.startsWith("ERROR:")) {
                                                                    alert(`Błąd: ${line.replace("ERROR:", "")}`);
                                                                    setGenerationStatus(prev => ({ ...prev, [q.id]: undefined }));
                                                                }
                                                            }
                                                        }
                                                    } catch (e: any) {
                                                        alert("Błąd połączenia: " + e.message);
                                                        setGenerationStatus(prev => ({ ...prev, [q.id]: undefined }));
                                                    }
                                                }}
                                                style={{ padding: "0.5rem 1rem", background: "var(--color-primary)", border: "none", borderRadius: "4px", color: "black", cursor: "pointer", fontWeight: "bold" }}
                                            >
                                                Generuj Artykuł ✍️
                                            </button>
                                        )}
                                        <button onClick={() => handleDeleteQuestion(q.id)} style={{ padding: "0.5rem 1rem", background: "var(--color-error)", border: "none", borderRadius: "4px", color: "white", cursor: "pointer" }}>Usuń (Spam)</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'news' && renderNewsTab()}
                    {activeTab === 'articles' && renderArticlesTab()}
                    {activeTab === 'blog' && renderBlogTab()}
                    {activeTab === 'orders' && renderOrdersTab()}
                    {activeTab === 'patients' && renderPatientsTab()}
                    {activeTab === 'sms-reminders' && renderSmsRemindersTab()}
                    {activeTab === 'appointment-instructions' && <AppointmentInstructionsEditor />}
                    {activeTab === 'employees' && renderEmployeesTab()}
                    {activeTab === 'roles' && renderRolesTab()}
                </div>
            </main>
        </div>
    );
}
