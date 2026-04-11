"use client";

import { useState, useEffect } from "react";
import RevealOnScroll from "@/components/RevealOnScroll";
import AppointmentInstructionsEditor from "@/components/AppointmentInstructionsEditor";
import AdminChat from "@/components/AdminChat";
import ThemeEditor from "@/components/ThemeEditor";
import PageBuilderTab from './components/PageBuilderTab';
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    ShoppingBag,
    Calendar,
    LayoutGrid,
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
    Shield,
    Paintbrush,
    Bell,
    Trash2,
    CalendarCheck,
    CalendarX,
    Phone,
    Pen,
    Fingerprint,
    ClipboardList,
    Send,
    Share2,
    Plug,
    Banknote
} from "lucide-react";
import { Product } from './components/AdminTypes';
import SocialMediaTab from './components/SocialMediaTab';
import PmsSettingsTab from './components/PmsSettingsTab';
import SmsSettingsTab from './components/SmsSettingsTab';
import StripeSettingsTab from './components/StripeSettingsTab';
import P24SettingsTab from './components/P24SettingsTab';
import PayUSettingsTab from './components/PayUSettingsTab';
import AIEducationTab from './components/AIEducationTab';
import PatientCommunicationTab from './components/PatientCommunicationTab';
import { demoSanitize } from '@/lib/brandConfig';

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

    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'questions' | 'articles' | 'news' | 'orders' | 'reservations' | 'blog' | 'patients' | 'appointment-instructions' | 'roles' | 'employees' | 'chat' | 'theme' | 'page-builder' | 'booking-settings' | 'online-bookings' | 'cancelled-appointments' | 'social-media' | 'pms-settings' | 'sms-provider' | 'stripe-settings' | 'p24-settings' | 'payu-settings' | 'ai-education' | 'patient-communication'>('dashboard');
    // Cancelled appointments state
    const [cancelledAppointments, setCancelledAppointments] = useState<any[]>([]);
    const [cancelledLoading, setCancelledLoading] = useState(false);
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
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [prodentisAvailable, setProdentisAvailable] = useState(true);
    const [showInactive, setShowInactive] = useState(false);
    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [employeeEmails, setEmployeeEmails] = useState<Record<string, string>>({});
    const [addingEmployee, setAddingEmployee] = useState<string | null>(null);
    const [newManualName, setNewManualName] = useState('');
    const [newManualEmail, setNewManualEmail] = useState('');
    const [addingManual, setAddingManual] = useState(false);
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

    // SMS stats — used by sidebar badge and dashboard
    const [smsStats, setSmsStats] = useState({ total: 0, draft: 0, sent: 0, failed: 0, cancelled: 0 });
    const [manualGenerationStatus, setManualGenerationStatus] = useState<string | null>(null);
    // Push employee groups — used by Roles tab push group chips
    const [pushEmpGroups, setPushEmpGroups] = useState<Record<string, string[]>>({});

    // Appointment Instructions state
    const [appointmentInstructions, setAppointmentInstructions] = useState<any[]>([]);
    const [editingInstruction, setEditingInstruction] = useState<any | null>(null);
    const [savingInstruction, setSavingInstruction] = useState(false);


    // Booking Settings state
    const [minDaysAhead, setMinDaysAhead] = useState(1);
    const [bookingSettingsSaving, setBookingSettingsSaving] = useState(false);
    const [bookingSettingsMsg, setBookingSettingsMsg] = useState<string | null>(null);

    // Online Bookings state
    const [onlineBookings, setOnlineBookings] = useState<any[]>([]);
    const [onlineBookingsLoading, setOnlineBookingsLoading] = useState(false);
    const [onlineBookingsFilter, setOnlineBookingsFilter] = useState<string>('pending');
    const [onlineBookingsPendingCount, setOnlineBookingsPendingCount] = useState(0);
    const [prodentisColors, setProdentisColors] = useState<any[]>([]);
    const [prodentisIcons, setProdentisIcons] = useState<any[]>([]);

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

    // ── Auth check — only on mount ──────────────────────────────────────
    const [authed, setAuthed] = useState(false);
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/admin/login");
            } else {
                setAuthed(true);
            }
        };
        checkUser();
    }, []);

    // ── Lazy data loading — fetch only what the active tab needs ──────
    // Track which tabs already loaded their data to avoid re-fetching on tab switch
    const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!authed) return;

        const markLoaded = (tab: string) => setLoadedTabs(prev => new Set(prev).add(tab));

        switch (activeTab) {
            case 'dashboard':
            case 'products':
                if (!loadedTabs.has('products')) {
                    fetchProducts();
                    markLoaded('products');
                }
                break;
            case 'questions':
                if (!loadedTabs.has('questions')) { fetchQuestions(); markLoaded('questions'); }
                break;
            case 'articles':
                if (!loadedTabs.has('articles')) { fetchArticles(); markLoaded('articles'); }
                break;
            case 'news':
                if (!loadedTabs.has('news')) { fetchNews(); markLoaded('news'); }
                break;
            case 'blog':
                if (!loadedTabs.has('blog')) { fetchBlogPosts(); markLoaded('blog'); }
                break;
            case 'orders':
                if (!loadedTabs.has('orders')) { fetchOrders(); markLoaded('orders'); }
                break;
            case 'reservations':
                if (!loadedTabs.has('reservations')) { fetchReservations(); markLoaded('reservations'); }
                break;
            case 'patients':
                if (!loadedTabs.has('patients')) { fetchPatients(); markLoaded('patients'); }
                break;
            case 'roles':
                if (!loadedTabs.has('roles')) { fetchRoles(); markLoaded('roles'); }
                break;
            case 'employees':
                if (!loadedTabs.has('employees')) { fetchEmployees(); markLoaded('employees'); }
                break;
            case 'online-bookings':
                if (!loadedTabs.has('online-bookings')) {
                    fetchProdentisColors();
                    fetchProdentisIcons();
                    markLoaded('online-bookings');
                }
                break;
            case 'booking-settings':
                if (!loadedTabs.has('booking-settings')) {
                    fetch('/api/admin/booking-settings')
                        .then(r => r.json())
                        .then(d => setMinDaysAhead(typeof d.min_days_ahead === 'number' ? d.min_days_ahead : 1))
                        .catch(() => { });
                    markLoaded('booking-settings');
                }
                break;
            case 'cancelled-appointments':
                if (!loadedTabs.has('cancelled-appointments')) {
                    setCancelledLoading(true);
                    fetch('/api/admin/cancelled-appointments?limit=100')
                        .then(r => r.json())
                        .then(d => setCancelledAppointments(d.appointments || []))
                        .catch(() => { })
                        .finally(() => setCancelledLoading(false));
                    markLoaded('cancelled-appointments');
                }
                break;
            // chat, theme, appointment-instructions
            // are handled by their own components' internal useEffect
        }
    }, [activeTab, authed]);

    // Fetch online bookings when filter changes
    useEffect(() => {
        if (activeTab === 'online-bookings') {
            fetchOnlineBookings();
        }
    }, [onlineBookingsFilter, activeTab]);

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

    // ── ONLINE BOOKINGS Functions ─────────────────────
    const fetchOnlineBookings = async () => {
        setOnlineBookingsLoading(true);
        try {
            const statusParam = onlineBookingsFilter === 'all' ? '' : `?status=${onlineBookingsFilter}`;
            const res = await fetch(`/api/admin/online-bookings${statusParam}`);
            const data = await res.json();
            setOnlineBookings(data.bookings || []);
            if (onlineBookingsFilter !== 'pending') {
                const pendingRes = await fetch('/api/admin/online-bookings?status=pending');
                const pendingData = await pendingRes.json();
                setOnlineBookingsPendingCount((pendingData.bookings || []).length);
            } else {
                setOnlineBookingsPendingCount((data.bookings || []).length);
            }
        } catch (err) {
            console.error('Failed to fetch online bookings:', err);
        } finally {
            setOnlineBookingsLoading(false);
        }
    };

    const handleApproveBooking = async (id: string) => {
        try {
            const res = await fetch('/api/admin/online-bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'approve', approvedBy: 'admin' }),
            });
            const data = await res.json();
            const booking = data.booking;
            if (booking?.schedule_status === 'scheduled') {
                alert(`✅ Wizyta wpisana do grafiku Prodentis!\nID: ${booking.prodentis_appointment_id}`);
            } else if (booking?.schedule_error) {
                alert(`⚠️ Wizyta zatwierdzona, ale nie udało się wpisać do grafiku:\n${booking.schedule_error}`);
            }
            fetchOnlineBookings();
        } catch (err) {
            console.error('Failed to approve booking:', err);
        }
    };

    const handleRejectBooking = async (id: string) => {
        if (!confirm('Czy na pewno chcesz odrzucić tę wizytę?')) return;
        try {
            await fetch('/api/admin/online-bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'reject', approvedBy: 'admin' }),
            });
            fetchOnlineBookings();
        } catch (err) {
            console.error('Failed to reject booking:', err);
        }
    };

    const handleDeleteBooking = async (id: string) => {
        if (!confirm('Usunąć wpis?')) return;
        try {
            await fetch(`/api/admin/online-bookings?id=${id}`, { method: 'DELETE' });
            fetchOnlineBookings();
        } catch (err) {
            console.error('Failed to delete booking:', err);
        }
    };

    const handleRetrySchedule = async (id: string) => {
        try {
            const res = await fetch('/api/admin/online-bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'schedule' }),
            });
            const data = await res.json();
            const booking = data.booking;
            if (booking?.schedule_status === 'scheduled') {
                alert(`✅ Wizyta wpisana do grafiku!\nID: ${booking.prodentis_appointment_id}`);
            } else if (booking?.schedule_error) {
                alert(`⚠️ Ponowna próba nie powiodła się:\n${booking.schedule_error}`);
            }
            fetchOnlineBookings();
        } catch (err) {
            console.error('Failed to retry schedule:', err);
        }
    };

    const handleApproveAllBookings = async () => {
        const pending = onlineBookings.filter((b: any) => b.schedule_status === 'pending');
        if (pending.length === 0) return;
        if (!confirm(`Zatwierdzić wszystkie ${pending.length} oczekujące wizyty?`)) return;
        for (const b of pending) {
            await fetch('/api/admin/online-bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: b.id, action: 'approve', approvedBy: 'admin' }),
            });
        }
        fetchOnlineBookings();
    };

    const fetchProdentisColors = async () => {
        try {
            const res = await fetch('/api/admin/prodentis-schedule/colors');
            const data = await res.json();
            setProdentisColors(data.colors || []);
        } catch (err) {
            console.error('Failed to fetch Prodentis colors:', err);
        }
    };

    const fetchProdentisIcons = async () => {
        try {
            const res = await fetch('/api/admin/prodentis-schedule/icons');
            const data = await res.json();
            setProdentisIcons(data.icons || []);
        } catch (err) {
            console.error('Failed to fetch Prodentis icons:', err);
        }
    };

    const handleChangeColor = async (appointmentId: string, colorId: string, colorName: string) => {
        try {
            const res = await fetch('/api/admin/prodentis-schedule/color', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, colorId }),
            });
            if (res.ok) {
                alert(`🎨 Kolor zmieniony na: ${colorName}`);
            } else {
                const data = await res.json();
                alert(`❌ Błąd: ${data.error || data.message}`);
            }
        } catch (err) {
            console.error('Failed to change color:', err);
        }
    };

    const handleAddIcon = async (appointmentId: string, iconId: string, iconName: string) => {
        try {
            const res = await fetch('/api/admin/prodentis-schedule/icon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, iconId }),
            });
            if (res.ok) {
                alert(`✅ Ikona "${iconName}" dodana do wizyty`);
            } else {
                const data = await res.json();
                alert(`❌ Błąd: ${data.error || data.message}`);
            }
        } catch (err) {
            console.error('Failed to add icon:', err);
        }
    };

    const handlePickPatient = async (bookingId: string, patientId: string, patientName: string) => {
        try {
            const res = await fetch('/api/admin/online-bookings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: bookingId, action: 'pick_patient', patientId, patientName }),
            });
            if (res.ok) {
                alert(`✅ Pacjent wybrany: ${patientName}\nMożesz teraz zatwierdzić wizytę.`);
                fetchOnlineBookings();
            } else {
                const data = await res.json();
                alert(`❌ Błąd: ${data.error}`);
            }
        } catch (err) {
            console.error('Failed to pick patient:', err);
        }
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
                // Pre-populate Podgrupa dropdowns from returned employee positions
                const posMap: Record<string, string[]> = {};
                for (const u of (data.users || [])) {
                    if (u.employeePosition?.push_groups?.length > 0) {
                        posMap[u.user_id] = u.employeePosition.push_groups;
                    } else if (u.employeePosition?.employee_group) {
                        // legacy fallback
                        posMap[u.user_id] = [u.employeePosition.employee_group];
                    }
                }
                setPushEmpGroups(posMap);
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
                setEmployeesList(data.employees || []);
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

    const deactivateEmployee = async (empId: string, name: string) => {
        if (!confirm(`Dezaktywowa\u0107 pracownika \u201e${name}\u201d?\n\nPracownik zniknie z:\n\u2022 Listy pracownik\u00f3w\n\u2022 Przypisywania do zada\u0144\n\u2022 Powiadomie\u0144 push\n\nDane w Prodentis NIE zostan\u0105 zmienione.`)) return;
        try {
            const res = await fetch('/api/admin/employees/deactivate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: empId }),
            });
            if (res.ok) {
                alert('\u2705 Pracownik dezaktywowany');
                fetchEmployees();
            } else {
                const data = await res.json();
                alert(`\u274c ${data.error}`);
            }
        } catch {
            alert('B\u0142\u0105d po\u0142\u0105czenia');
        }
    };

    const reactivateEmployee = async (empId: string, name: string) => {
        if (!confirm(`Reaktywowa\u0107 pracownika \u201e${name}\u201d?`)) return;
        try {
            const res = await fetch('/api/admin/employees/deactivate', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: empId }),
            });
            if (res.ok) {
                alert('\u2705 Pracownik reaktywowany');
                fetchEmployees();
            } else {
                const data = await res.json();
                alert(`\u274c ${data.error}`);
            }
        } catch {
            alert('B\u0142\u0105d po\u0142\u0105czenia');
        }
    };


    const startEditEmployee = (emp: any) => {
        setEditingEmployeeId(emp.id);
        setEditName(emp.name || '');
        setEditEmail(emp.email || '');
    };

    const saveEditEmployee = async (empId: string) => {
        try {
            const res = await fetch('/api/admin/employees', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: empId, name: editName.trim(), email: editEmail.trim() }),
            });
            if (res.ok) {
                alert('\u2705 Zapisano');
                setEditingEmployeeId(null);
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
            return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Ładowanie pracowników...</div>;
        }

        const activeEmployees = employeesList.filter((e: any) => e.is_active);
        const inactiveEmployees = employeesList.filter((e: any) => !e.is_active);
        const displayList = showInactive ? employeesList : activeEmployees;

        return (
            <div>
                {/* Prodentis connection status */}
                {!prodentisAvailable && (
                    <div style={{
                        padding: '0.75rem 1rem', marginBottom: '1.5rem',
                        background: '#eab30815', border: '1px solid #eab30840',
                        borderRadius: '8px', fontSize: '0.85rem', color: '#eab308'
                    }}>
                        ⚠️ Brak połączenia z Prodentis — nowi operatorzy nie zostaną automatycznie wykryci.
                    </div>
                )}

                {/* Header */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-main)' }}>
                            Pracownicy ({activeEmployees.length})
                            {inactiveEmployees.length > 0 && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                                    + {inactiveEmployees.length} nieaktywnych
                                </span>
                            )}
                        </h3>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Jedna lista — operatorzy Prodentis i dodani ręcznie
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={() => setShowInactive(!showInactive)} style={{
                            padding: '0.4rem 0.8rem', background: showInactive ? 'rgba(255,255,255,0.1)' : 'transparent',
                            border: '1px solid var(--color-border)', borderRadius: '6px',
                            color: showInactive ? '#ef4444' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem',
                        }}>
                            {showInactive ? '👁 Ukryj nieaktywnych' : `👁 Nieaktywni (${inactiveEmployees.length})`}
                        </button>
                        <button onClick={fetchEmployees} style={{
                            padding: '0.4rem 1rem', background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)', borderRadius: '6px',
                            color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '0.85rem'
                        }}>Odśwież</button>
                    </div>
                </div>

                {/* Employee List */}
                {displayList.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '2rem',
                        background: 'var(--color-surface)', borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                    }}>
                        Brak pracowników. Dodaj ręcznie poniżej lub poczekaj na synchronizację z Prodentis.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {displayList.map((emp: any) => {
                            const isExpanded = expandedStaffId === emp.id;
                            const isInactive = !emp.is_active;
                            return (
                                <div key={emp.id} style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: '10px',
                                    border: `1px solid ${isExpanded ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s',
                                    opacity: isInactive ? 0.5 : 1,
                                }}>
                                    {/* Header row — always visible */}
                                    <div
                                        onClick={() => setExpandedStaffId(isExpanded ? null : emp.id)}
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
                                            <span style={{ fontWeight: '600', fontSize: '0.95rem', color: isInactive ? 'var(--color-text-muted)' : 'var(--color-text-main)' }}>
                                                {emp.name}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {emp.prodentis_id && (
                                                <span style={{
                                                    padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '600',
                                                    background: '#3b82f622', color: '#60a5fa',
                                                }}>Prodentis</span>
                                            )}
                                            {emp.has_account && (
                                                <span style={{
                                                    padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '600',
                                                    background: '#22c55e22', color: '#22c55e',
                                                }}>Konto</span>
                                            )}
                                            {isInactive && (
                                                <span style={{
                                                    padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '600',
                                                    background: '#ef444422', color: '#ef4444',
                                                }}>Nieaktywny</span>
                                            )}
                                        </div>
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
                                            {/* Info / Edit mode */}
                                            {editingEmployeeId === emp.id ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        <div style={{ flex: 1, minWidth: '150px' }}>
                                                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem' }}>Imię i nazwisko</label>
                                                            <input value={editName} onChange={(e) => setEditName(e.target.value)}
                                                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '2px solid var(--color-primary)', background: 'var(--color-background)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit' }} />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: '180px' }}>
                                                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem' }}>Email</label>
                                                            <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email"
                                                                style={{ width: '100%', boxSizing: 'border-box', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '2px solid var(--color-primary)', background: 'var(--color-background)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit' }} />
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button onClick={() => saveEditEmployee(emp.id)} style={{ padding: '0.3rem 0.8rem', background: 'var(--color-primary)', border: 'none', borderRadius: '5px', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}>💾 Zapisz</button>
                                                        <button onClick={() => setEditingEmployeeId(null)} style={{ padding: '0.3rem 0.8rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '5px', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Anuluj</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', alignItems: 'center' }}>
                                                    {emp.email && <span>📧 {emp.email}</span>}
                                                    {emp.prodentis_id && <span>🔗 Prodentis ID: {emp.prodentis_id}</span>}
                                                    {emp.position && <span>👤 {emp.position}</span>}
                                                    <button onClick={() => startEditEmployee(emp)} style={{ padding: '0.15rem 0.5rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}>✏️ Edytuj</button>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                {emp.has_account && emp.email && (
                                                    <button
                                                        onClick={() => sendResetPassword(emp.email)}
                                                        style={{
                                                            padding: '0.35rem 0.8rem', background: 'transparent',
                                                            color: 'var(--color-text-muted)', border: '1px solid var(--color-border)',
                                                            borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem',
                                                        }}
                                                    >🔑 Reset hasła</button>
                                                )}
                                                {!emp.has_account && (
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                                                        <input
                                                            type="email"
                                                            placeholder="Adres email pracownika..."
                                                            value={employeeEmails[emp.id] || ''}
                                                            onChange={(e) => setEmployeeEmails((prev: any) => ({ ...prev, [emp.id]: e.target.value }))}
                                                            style={{
                                                                flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem',
                                                                borderRadius: '6px', border: '2px solid var(--color-border)',
                                                                background: 'var(--color-background)', color: 'var(--color-text-main)',
                                                                fontSize: '0.9rem', fontFamily: 'inherit',
                                                            }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') addEmployee(emp.id, emp.name); }}
                                                        />
                                                        <button
                                                            onClick={() => addEmployee(emp.id, emp.name)}
                                                            disabled={addingEmployee === emp.id || !employeeEmails[emp.id]?.trim()}
                                                            style={{
                                                                padding: '0.5rem 1.25rem',
                                                                background: (!employeeEmails[emp.id]?.trim() || addingEmployee === emp.id) ? '#444' : 'var(--color-primary)',
                                                                border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold',
                                                                cursor: (!employeeEmails[emp.id]?.trim() || addingEmployee === emp.id) ? 'not-allowed' : 'pointer',
                                                                fontSize: '0.85rem', whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {addingEmployee === emp.id ? '⏳ Tworzę...' : '➕ Dodaj konto'}
                                                        </button>
                                                    </div>
                                                )}
                                                {emp.is_active ? (
                                                    <button
                                                        onClick={() => deactivateEmployee(emp.id, emp.name)}
                                                        style={{
                                                            padding: '0.3rem 0.7rem', background: 'transparent',
                                                            color: 'var(--color-error, #ef4444)', border: '1px solid var(--color-error, #ef4444)',
                                                            borderRadius: '5px', cursor: 'pointer', fontSize: '0.7rem',
                                                        }}
                                                    >✖ Dezaktywuj</button>
                                                ) : (
                                                    <button
                                                        onClick={() => reactivateEmployee(emp.id, emp.name)}
                                                        style={{
                                                            padding: '0.3rem 0.7rem', background: 'transparent',
                                                            color: '#22c55e', border: '1px solid #22c55e',
                                                            borderRadius: '5px', cursor: 'pointer', fontSize: '0.7rem',
                                                        }}
                                                    >✔ Reaktywuj</button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
                        ➕ Dodaj ręcznie
                    </h3>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Dla pracowników spoza Prodentis (np. administracja, marketing)
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
                                    padding: '0.5rem 0.75rem', borderRadius: '6px',
                                    border: '2px solid var(--color-border)',
                                    background: 'var(--color-background)', color: 'var(--color-text-main)',
                                    fontSize: '0.9rem', fontFamily: 'inherit',
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
                                    padding: '0.5rem 0.75rem', borderRadius: '6px',
                                    border: '2px solid var(--color-border)',
                                    background: 'var(--color-background)', color: 'var(--color-text-main)',
                                    fontSize: '0.9rem', fontFamily: 'inherit',
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
                                border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold',
                                cursor: (addingManual || !newManualName.trim() || !newManualEmail.trim()) ? 'not-allowed' : 'pointer',
                                fontSize: '0.85rem', whiteSpace: 'nowrap',
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
                                    background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" // Gold gradient
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
                        style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))", color: "black", fontSize: "0.9rem" }}
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
                                    background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))"
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
                                        bgColor = 'rgba(var(--color-primary-rgb), 0.2)';
                                        textColor = 'var(--color-primary)';
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
                                {/* Podgrupa push — multi-chip selector in Roles tab */}
                                {user.roles.includes('employee') && (() => {
                                    const EMP_OPTS = [
                                        { key: 'doctor', label: '🦷 Lekarz' },
                                        { key: 'hygienist', label: '💉 Higienistka' },
                                        { key: 'reception', label: '📞 Recepcja' },
                                        { key: 'assistant', label: '🔧 Asysta' },
                                    ];
                                    const currentGroups = pushEmpGroups[user.user_id] || [];
                                    return (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>Grupy push:</span>
                                            {EMP_OPTS.map(opt => {
                                                const active = currentGroups.includes(opt.key);
                                                return (
                                                    <button key={opt.key}
                                                        onClick={() => {
                                                            const next = active
                                                                ? currentGroups.filter(g => g !== opt.key)
                                                                : [...currentGroups, opt.key];
                                                            setPushEmpGroups(prev => ({ ...prev, [user.user_id]: next }));
                                                            // auto-save immediately
                                                            fetch('/api/admin/employees/position', {
                                                                method: 'PATCH',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ userId: user.user_id, groups: next }),
                                                            });
                                                        }}
                                                        style={{
                                                            padding: '0.18rem 0.5rem', borderRadius: '2rem', fontSize: '0.7rem', cursor: 'pointer',
                                                            border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                            background: active ? 'rgba(250,189,0,0.12)' : 'transparent',
                                                            color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                            fontWeight: active ? 'bold' : 'normal', transition: 'all 0.1s',
                                                        }}>{opt.label}</button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
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
                                    border: '1px solid rgba(var(--color-primary-rgb), 0.3)',
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


    // ── RENDER: Online Bookings Tab ───────────────────
    const renderOnlineBookingsTab = () => {
        const statusColors: Record<string, string> = {
            pending: '#f59e0b',
            approved: '#3b82f6',
            scheduled: '#22c55e',
            rejected: '#ef4444',
            failed: '#ef4444',
        };
        const statusLabels: Record<string, string> = {
            pending: '⏳ Oczekuje',
            approved: '✅ Zatwierdzona',
            scheduled: '📅 W grafiku',
            rejected: '❌ Odrzucona',
            failed: '⚠️ Błąd',
        };
        const filterOptions = ['pending', 'approved', 'scheduled', 'rejected', 'all'];
        const filterLabels: Record<string, string> = {
            pending: 'Oczekujące',
            approved: 'Zatwierdzone',
            scheduled: 'W grafiku',
            rejected: 'Odrzucone',
            all: 'Wszystkie',
        };

        const pendingBookings = onlineBookings.filter(b => b.schedule_status === 'pending');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Filter pills */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {filterOptions.map(f => (
                        <button
                            key={f}
                            onClick={() => setOnlineBookingsFilter(f)}
                            style={{
                                padding: '0.4rem 1rem',
                                borderRadius: '2rem',
                                border: `1px solid ${onlineBookingsFilter === f ? 'var(--color-primary)' : 'rgba(255,255,255,0.12)'}`,
                                background: onlineBookingsFilter === f ? 'rgba(var(--color-primary-rgb),0.15)' : 'transparent',
                                color: onlineBookingsFilter === f ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                fontWeight: onlineBookingsFilter === f ? 'bold' : 'normal',
                            }}
                        >
                            {filterLabels[f]}
                        </button>
                    ))}
                    <button
                        onClick={fetchOnlineBookings}
                        style={{ marginLeft: 'auto', padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.78rem' }}
                    >
                        🔄 Odśwież
                    </button>
                </div>

                {/* Bulk approve */}
                {pendingBookings.length > 0 && onlineBookingsFilter === 'pending' && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.75rem',
                    }}>
                        <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {pendingBookings.length} {pendingBookings.length === 1 ? 'wizyta oczekuje' : 'wizyt oczekuje'} na zatwierdzenie
                        </span>
                        <button
                            onClick={handleApproveAllBookings}
                            style={{
                                padding: '0.5rem 1.2rem', background: 'var(--color-primary)',
                                border: 'none', borderRadius: '0.5rem', color: 'black',
                                fontWeight: 'bold', cursor: 'pointer', fontSize: '0.82rem',
                            }}
                        >
                            ✅ Zatwierdź wszystkie
                        </button>
                    </div>
                )}

                {/* Loading */}
                {onlineBookingsLoading && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>⏳ Ładowanie...</div>
                )}

                {/* Empty state */}
                {!onlineBookingsLoading && onlineBookings.length === 0 && (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                        Brak wizyt w tej kategorii.
                    </div>
                )}

                {/* Booking cards */}
                {!onlineBookingsLoading && onlineBookings.map(b => (
                    <div key={b.id} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '0.75rem', padding: '1rem 1.25rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                            {/* Left: Date + Patient */}
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>
                                        {new Date(b.appointment_date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                        {b.appointment_time?.slice(0, 5)}
                                    </span>
                                    {b.is_new_patient && (
                                        <span style={{
                                            padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem',
                                            background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 'bold',
                                        }}>
                                            🆕 NOWY
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.95rem', color: 'white', fontWeight: 500 }}>
                                    {b.patient_name}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>
                                    📞 {b.patient_phone}
                                    {b.patient_email && <> &middot; ✉️ {b.patient_email}</>}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                                    🩺 {b.specialist_name}
                                    {b.service_type && <> &middot; {b.service_type}</>}
                                </div>
                                {b.description && (
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                                        💬 &quot;{b.description}&quot;
                                    </div>
                                )}
                                {b.intake_url && (
                                    <div style={{ fontSize: '0.72rem', marginTop: '0.3rem' }}>
                                        <a href={b.intake_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                                            📋 Link do e-karty
                                        </a>
                                    </div>
                                )}
                                {b.prodentis_appointment_id && (
                                    <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', color: '#22c55e' }}>
                                        📅 Prodentis ID: {b.prodentis_appointment_id}
                                    </div>
                                )}
                                {b.schedule_error && (
                                    <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '0.25rem 0.5rem', borderRadius: '0.3rem' }}>
                                        ⚠️ {b.schedule_error}
                                    </div>
                                )}
                                {/* Match confidence badge */}
                                {b.match_confidence != null && b.patient_match_method !== 'needs_review' && (
                                    <div style={{ fontSize: '0.65rem', marginTop: '0.2rem', color: b.match_confidence >= 85 ? 'rgba(34,197,94,0.6)' : 'rgba(245,158,11,0.6)' }}>
                                        🎯 Match: {b.match_confidence}% ({b.patient_match_method})
                                    </div>
                                )}
                                {/* NEEDS REVIEW — candidate picker */}
                                {b.patient_match_method === 'needs_review' && b.match_candidates && (
                                    <div style={{
                                        marginTop: '0.4rem', padding: '0.5rem', borderRadius: '0.4rem',
                                        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                                    }}>
                                        <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                                            ⚠️ Wymaga weryfikacji — znaleziono {b.match_candidates.length} kandydat(ów) o takim samym numerze telefonu:
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem' }}>
                                            Pacjent wpisał: <strong style={{ color: 'white' }}>{b.patient_name}</strong> (tel. {b.patient_phone})
                                        </div>
                                        {(b.match_candidates as any[]).map((c: any, i: number) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '0.3rem 0.4rem', marginTop: '0.2rem',
                                                background: 'rgba(255,255,255,0.03)', borderRadius: '0.3rem',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                            }}>
                                                <div>
                                                    <span style={{ color: 'white', fontSize: '0.72rem' }}>
                                                        {c.firstName} {c.lastName}
                                                    </span>
                                                    <span style={{
                                                        marginLeft: '0.4rem', fontSize: '0.65rem',
                                                        color: c.score >= 85 ? '#22c55e' : c.score >= 60 ? '#f59e0b' : '#ef4444',
                                                    }}>
                                                        ({c.score}%)
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handlePickPatient(b.id, c.id, `${c.firstName} ${c.lastName}`)}
                                                    style={{
                                                        padding: '0.15rem 0.5rem', fontSize: '0.65rem',
                                                        background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
                                                        borderRadius: '0.3rem', color: '#3b82f6', cursor: 'pointer',
                                                    }}
                                                >
                                                    Wybierz
                                                </button>
                                            </div>
                                        ))}
                                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                                            Wybierz pacjenta lub zatwierdź jako nowego
                                        </div>
                                    </div>
                                )}
                                {/* Phone conflict — no candidates to pick */}
                                {b.patient_match_method === 'phone_conflict' && (
                                    <div style={{ fontSize: '0.68rem', marginTop: '0.3rem', color: '#f59e0b', fontStyle: 'italic' }}>
                                        📞 Konflikt telefonu — inny pacjent ma ten numer. Utworzono nowe konto.
                                    </div>
                                )}
                            </div>

                            {/* Right: Status + Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                <span style={{
                                    padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem',
                                    fontWeight: 'bold', color: statusColors[b.schedule_status] || 'white',
                                    border: `1px solid ${statusColors[b.schedule_status] || 'rgba(255,255,255,0.2)'}`,
                                    background: `${statusColors[b.schedule_status]}15`,
                                }}>
                                    {statusLabels[b.schedule_status] || b.schedule_status}
                                </span>
                                {b.patient_match_method === 'needs_review' && (
                                    <span style={{
                                        padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem',
                                        fontWeight: 'bold', color: '#f59e0b',
                                        border: '1px solid rgba(245,158,11,0.3)',
                                        background: 'rgba(245,158,11,0.1)',
                                    }}>
                                        ⚠️ Weryfikacja
                                    </span>
                                )}
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    {b.schedule_status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleApproveBooking(b.id)}
                                                style={{
                                                    padding: '0.3rem 0.8rem', background: 'rgba(34,197,94,0.1)',
                                                    border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.4rem',
                                                    color: '#22c55e', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold',
                                                }}
                                            >
                                                ✅ Zatwierdź
                                            </button>
                                            <button
                                                onClick={() => handleRejectBooking(b.id)}
                                                style={{
                                                    padding: '0.3rem 0.8rem', background: 'rgba(239,68,68,0.08)',
                                                    border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.4rem',
                                                    color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem',
                                                }}
                                            >
                                                ❌ Odrzuć
                                            </button>
                                        </>
                                    )}
                                    {b.schedule_status === 'approved' && b.schedule_error && (
                                        <button
                                            onClick={() => handleRetrySchedule(b.id)}
                                            style={{
                                                padding: '0.3rem 0.8rem', background: 'rgba(245,158,11,0.1)',
                                                border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.4rem',
                                                color: '#f59e0b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold',
                                            }}
                                        >
                                            🔄 Ponów
                                        </button>
                                    )}
                                    {b.schedule_status === 'scheduled' && b.prodentis_appointment_id && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
                                            {/* Color selector */}
                                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                <select
                                                    onChange={(e) => {
                                                        const colorId = e.target.value;
                                                        const color = prodentisColors.find((c: any) => c.id === colorId);
                                                        if (color) handleChangeColor(b.prodentis_appointment_id, colorId, color.name);
                                                        e.target.value = '';
                                                    }}
                                                    defaultValue=""
                                                    style={{
                                                        padding: '0.2rem 0.4rem', fontSize: '0.7rem',
                                                        background: 'rgba(255,255,255,0.05)', color: 'white',
                                                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: '0.3rem',
                                                        cursor: 'pointer', maxWidth: '140px',
                                                    }}
                                                >
                                                    <option value="" disabled>🎨 Zmień kolor</option>
                                                    {prodentisColors.map((c: any) => (
                                                        <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>
                                                            {c.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {/* Icon buttons */}
                                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                {prodentisIcons.map((icon: any) => (
                                                    <button
                                                        key={icon.id}
                                                        onClick={() => handleAddIcon(b.prodentis_appointment_id, icon.id, icon.name)}
                                                        title={icon.name}
                                                        style={{
                                                            padding: '0.2rem 0.5rem', fontSize: '0.65rem',
                                                            background: icon.name === 'Pacjent potwierdzony' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                                                            border: `1px solid ${icon.name === 'Pacjent potwierdzony' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                            borderRadius: '0.3rem',
                                                            color: icon.name === 'Pacjent potwierdzony' ? '#22c55e' : 'rgba(255,255,255,0.5)',
                                                            cursor: 'pointer', whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {icon.name === 'Pacjent potwierdzony' ? '✅' : icon.name === 'VIP' ? '⭐' : icon.name === 'Pierwszorazowy' ? '🆕' : '🏷️'} {icon.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDeleteBooking(b.id)}
                                        style={{
                                            padding: '0.3rem 0.8rem', background: 'transparent',
                                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem',
                                            color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.72rem',
                                        }}
                                    >
                                        🗑 Usuń
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>
                                    {new Date(b.created_at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };


    const NavSection = ({ title }: { title: string }) => (
        <div style={{ padding: '0 1rem 0.3rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.8rem' }}>
            {title}
        </div>
    );

    const NavItem = ({ id, label, icon: Icon, badge, onClick: customOnClick, href }: any) => {
        const isActive = activeTab === id;
        const content = (
            <>
                <Icon size={18} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && (
                    <span style={{
                        background: '#f59e0b',
                        color: 'black',
                        borderRadius: '50%',
                        minWidth: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                    }}>
                        {badge}
                    </span>
                )}
            </>
        );
        const baseStyle: React.CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            width: '100%',
            padding: '0.65rem 1rem',
            background: isActive ? 'var(--color-primary)' : 'transparent',
            color: isActive ? 'black' : 'var(--color-text-muted)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: isActive ? 'bold' : 'normal',
            textAlign: 'left',
            fontSize: '0.88rem',
            textDecoration: 'none',
        };
        if (href) {
            return <a href={href} style={baseStyle}>{content}</a>;
        }
        return (
            <button onClick={customOnClick || (() => setActiveTab(id))} style={baseStyle}>
                {content}
            </button>
        );
    };

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

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1, overflowY: 'auto' }}>
                    <NavItem id="dashboard" label="Pulpit" icon={LayoutDashboard} />

                    <NavSection title="Wizyty" />
                    <NavItem id="online-bookings" label="Wizyty Online" icon={CalendarCheck} badge={onlineBookingsPendingCount} />
                    <NavItem id="reservations" label="Rezerwacje (formularz)" icon={Calendar} />
                    <NavItem id="cancelled-appointments" label="Odwołane wizyty" icon={CalendarX} />
                    <NavItem id="booking-settings" label="Ustawienia rezerwacji" icon={Settings} />
                    <NavItem id="pms-settings" label="Integracja PMS" icon={Plug} />
                    <NavItem id="sms-provider" label="SMS API" icon={MessageCircle} />
                    <NavItem id="stripe-settings" label="Stripe" icon={ShoppingBag} />
                    <NavItem id="p24-settings" label="Przelewy24" icon={Banknote} />
                    <NavItem id="payu-settings" label="PayU" icon={Banknote} />
                    <NavItem id="appointment-instructions" label="Instrukcje wizyt" icon={ClipboardList} />

                    <NavSection title="Komunikacja" />
                    <NavItem id="patient-communication" label="📨 Komunikacja" icon={Send} badge={smsStats.draft} />
                    <NavItem id="chat" label="Czat z pacjentami" icon={MessageCircle} />

                    <NavSection title="AI Asystent" />
                    <NavItem id="ai-education" label="🧠 AI Edukacja" icon={BookOpen} />

                    <NavSection title="Social Media" />
                    <NavItem id="social-media" label="Social Media" icon={Share2} />

                    <NavSection title="Zespół" />
                    <NavItem id="employees" label="Pracownicy" icon={Users} />
                    <NavItem id="roles" label="Uprawnienia" icon={Shield} />
                    <NavItem id="patients" label="Pacjenci" icon={Users} />

                    <NavSection title="Treści" />
                    <NavItem id="news" label="Aktualności" icon={Newspaper} />
                    <NavItem id="blog" label="Blog" icon={FileText} />
                    <NavItem id="articles" label="Baza Wiedzy" icon={BookOpen} />
                    <NavItem id="questions" label="Pytania Eksperta" icon={HelpCircle} />

                    <NavSection title="Sklep" />
                    <NavItem id="orders" label="Zamówienia" icon={ShoppingBag} />
                    <NavItem id="products" label="Produkty" icon={Package} />

                    <NavSection title="Zgody PDF" />
                    <NavItem id="" label="Podpisy personelu" icon={Pen} href="/admin/staff-signatures" />
                    <NavItem id="" label="Mapper PDF" icon={Settings} href="/admin/pdf-mapper" />
                    <NavItem id="" label="Biometria podpisów" icon={Fingerprint} href="/admin/biometric-signatures" />

                    <NavSection title="Wygląd" />
                    <NavItem id="theme" label="Motyw strony" icon={Paintbrush} />
                    <NavItem id="page-builder" label="Kreator strony" icon={LayoutGrid} />
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
                            {activeTab === 'appointment-instructions' && 'Instrukcje Wizyt'}
                            {activeTab === 'orders' && 'Zamówienia Sklepu'}
                            {activeTab === 'products' && 'Zarządzanie Produktami'}
                            {activeTab === 'news' && 'Aktualności'}
                            {activeTab === 'articles' && 'Baza Wiedzy'}
                            {activeTab === 'blog' && 'Blog (Dr. Marcin Nowosielski)'}
                            {activeTab === 'questions' && 'Pytania do Eksperta'}
                            {activeTab === 'employees' && 'Pracownicy — Zarządzanie Kontami'}
                            {activeTab === 'roles' && 'Uprawnienia — Zarządzanie Rolami'}
                            {activeTab === 'patient-communication' && '📨 Komunikacja z Pacjentem'}
                            {activeTab === 'chat' && '💬 Czat z Pacjentami'}
                            {activeTab === 'booking-settings' && '📅 Rezerwacje'}
                            {activeTab === 'online-bookings' && '📅 Wizyty Umówione Online'}
                            {activeTab === 'cancelled-appointments' && '❌ Odwołane Wizyty'}
                            {activeTab === 'page-builder' && '🏗️ Kreator Strony Głównej'}
                            {activeTab === 'ai-education' && '🧠 AI Asystent — Edukacja'}
                        </h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            {/* Header Actions if needed */}
                        </div>
                    </header>


                    {activeTab === 'dashboard' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* ── Metric Cards ── */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                                {[
                                    { label: 'Wizyty Online (oczekujące)', value: onlineBookingsPendingCount, color: onlineBookingsPendingCount > 0 ? '#f59e0b' : 'white', tab: 'online-bookings' as const },
                                    { label: 'Rezerwacje (formularz)', value: reservations.length, color: 'var(--color-primary)', tab: 'reservations' as const },
                                    { label: 'SMS Robocze', value: smsStats.draft, color: smsStats.draft > 0 ? '#ef4444' : 'white', tab: 'patient-communication' as const },
                                    { label: 'Pytania do Eksperta', value: questions.filter(q => q.status === 'pending').length, color: questions.some(q => q.status === 'pending') ? '#ef4444' : 'white', tab: 'questions' as const },
                                    { label: 'Zamówienia', value: orders.length, color: orders.length > 0 ? '#22c55e' : 'white', tab: 'orders' as const },
                                    { label: 'Pacjenci', value: patients.length, color: 'white', tab: 'patients' as const },
                                ].map(card => (
                                    <button key={card.label} onClick={() => setActiveTab(card.tab)} style={{
                                        background: 'var(--color-surface)', padding: '1.2rem', borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--color-surface-hover)', cursor: 'pointer', textAlign: 'left',
                                        transition: 'all 0.2s',
                                    }}>
                                        <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'normal' }}>{card.label}</h3>
                                        <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: card.color, margin: 0 }}>{card.value}</p>
                                    </button>
                                ))}
                            </div>

                            {/* ── Quick Actions ── */}
                            <div>
                                <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem' }}>Szybkie akcje</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    {[
                                        { label: 'Wizyty Online', tab: 'online-bookings' as const, icon: '📅' },
                                        { label: 'SMS Przypomnienia', tab: 'patient-communication' as const, icon: '📱' },
                                        { label: 'Pracownicy', tab: 'employees' as const, icon: '👥' },
                                        { label: 'Aktualności', tab: 'news' as const, icon: '📰' },
                                        { label: 'Push', tab: 'patient-communication' as const, icon: '🔔' },
                                    ].map(action => (
                                        <button key={action.label} onClick={() => setActiveTab(action.tab)} style={{
                                            padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)',
                                            color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.88rem',
                                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        }}>
                                            <span>{action.icon}</span> {action.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── System Info ── */}
                            <div style={{ padding: '1rem 1.2rem', background: 'rgba(var(--color-primary-rgb),0.04)', border: '1px solid rgba(var(--color-primary-rgb),0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                <strong style={{ color: 'var(--color-primary)' }}>Mikrostomart Admin v2.1</strong> — Panel zarządzania kliniką stomatologiczną
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
                                        <span style={{ background: q.status === 'pending' ? 'var(--color-primary)' : 'green', color: 'black', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{q.status}</span>
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
                    {activeTab === 'appointment-instructions' && <AppointmentInstructionsEditor />}
                    {activeTab === 'employees' && renderEmployeesTab()}
                    {activeTab === 'roles' && renderRolesTab()}
                    {activeTab === 'chat' && <AdminChat />}
                    {activeTab === 'theme' && <ThemeEditor />}
                    {activeTab === 'social-media' && <SocialMediaTab />}
                    {activeTab === 'pms-settings' && <PmsSettingsTab />}
                    {activeTab === 'sms-provider' && <SmsSettingsTab />}
                    {activeTab === 'stripe-settings' && <StripeSettingsTab />}
                    {activeTab === 'p24-settings' && <P24SettingsTab />}
                    {activeTab === 'payu-settings' && <PayUSettingsTab />}
                    {activeTab === 'page-builder' && <PageBuilderTab />}
                    {activeTab === 'ai-education' && <AIEducationTab />}
                    {activeTab === 'patient-communication' && <PatientCommunicationTab />}
                    {activeTab === 'online-bookings' && renderOnlineBookingsTab()}
                    {activeTab === 'cancelled-appointments' && (() => {
                        // Fetch on first render
                        if (!cancelledLoading && cancelledAppointments.length === 0) {
                            setCancelledLoading(true);
                            fetch('/api/admin/cancelled-appointments?limit=100')
                                .then(r => r.json())
                                .then(d => setCancelledAppointments(d.appointments || []))
                                .catch(() => { })
                                .finally(() => setCancelledLoading(false));
                        }
                        return (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        Wizyty odwołane przez pacjentów ze Strefy Pacjenta ({cancelledAppointments.length})
                                    </p>
                                    <button
                                        onClick={() => {
                                            setCancelledLoading(true);
                                            fetch('/api/admin/cancelled-appointments?limit=100')
                                                .then(r => r.json())
                                                .then(d => setCancelledAppointments(d.appointments || []))
                                                .catch(() => { })
                                                .finally(() => setCancelledLoading(false));
                                        }}
                                        style={{ padding: '0.5rem 1rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', cursor: 'pointer', fontSize: '0.85rem' }}
                                    >
                                        🔄 Odśwież
                                    </button>
                                </div>
                                {cancelledLoading ? (
                                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Ładowanie...</p>
                                ) : cancelledAppointments.length === 0 ? (
                                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Brak odwołanych wizyt</p>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Pacjent</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Telefon</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Data wizyty</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Lekarz</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Powód</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Odwołano</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cancelledAppointments.map((ca: any) => (
                                                    <tr key={ca.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{ca.patient_name || '—'}</td>
                                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                                                            {ca.patient_phone ? <a href={`tel:${ca.patient_phone}`} style={{ color: 'var(--color-primary)' }}>{ca.patient_phone}</a> : '—'}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                                                            {ca.appointment_date ? new Date(ca.appointment_date).toLocaleString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{ca.doctor_name || '—'}</td>
                                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ca.reason || '—'}</td>
                                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                            {ca.cancelled_at ? new Date(ca.cancelled_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    {activeTab === 'booking-settings' && (
                        <div style={{ padding: '2rem', maxWidth: 540 }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>📅 Ustawienia Rezerwacji Online</h2>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                Kontroluj, z jakim wyprzedzeniem pacjenci mogą umawiać wizyty przez formularz online (/rezerwacja).
                            </p>

                            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.95rem' }}>
                                    Minimalny czas zapisu z wyprzedzeniem
                                </label>
                                <select
                                    value={minDaysAhead}
                                    onChange={e => setMinDaysAhead(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(var(--color-primary-rgb),0.3)',
                                        borderRadius: '0.5rem',
                                        color: 'white',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    <option value={0}>Dziś (0 dni) — pokazuj terminy od dnia dzisiejszego</option>
                                    <option value={1}>Jutro (1 dzień) — najszybciej od jutra ✅ zalecane</option>
                                    <option value={2}>2 dni — najszybciej pojutrze</option>
                                    <option value={3}>3 dni</option>
                                    <option value={7}>Tydzień (7 dni)</option>
                                    <option value={14}>2 tygodnie (14 dni)</option>
                                </select>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    Aktualnie: sloty wyświetlają się najwcześniej za <strong style={{ color: 'var(--color-primary)' }}>{minDaysAhead} {minDaysAhead === 1 ? 'dzień' : minDaysAhead < 5 ? 'dni' : 'dni'}</strong> od dziś.
                                </p>
                            </div>

                            <button
                                onClick={async () => {
                                    setBookingSettingsSaving(true);
                                    setBookingSettingsMsg(null);
                                    try {
                                        const res = await fetch('/api/admin/booking-settings', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ min_days_ahead: minDaysAhead }),
                                        });
                                        if (!res.ok) throw new Error('Błąd zapisu');
                                        setBookingSettingsMsg('✅ Ustawienie zapisane pomyślnie.');
                                    } catch {
                                        setBookingSettingsMsg('❌ Błąd zapisu. Sprawdź połączenie.');
                                    } finally {
                                        setBookingSettingsSaving(false);
                                        setTimeout(() => setBookingSettingsMsg(null), 4000);
                                    }
                                }}
                                disabled={bookingSettingsSaving}
                                style={{
                                    padding: '0.8rem 2rem',
                                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: 'black',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    cursor: bookingSettingsSaving ? 'not-allowed' : 'pointer',
                                    opacity: bookingSettingsSaving ? 0.7 : 1,
                                }}
                            >
                                {bookingSettingsSaving ? 'Zapisywanie...' : 'Zapisz ustawienie'}
                            </button>

                            {bookingSettingsMsg && (
                                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: bookingSettingsMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${bookingSettingsMsg.startsWith('✅') ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius: '0.5rem', fontSize: '0.9rem' }}>
                                    {bookingSettingsMsg}
                                </div>
                            )}

                            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(var(--color-primary-rgb),0.06)', border: '1px solid rgba(var(--color-primary-rgb),0.2)', borderRadius: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                <strong style={{ color: 'var(--color-primary)' }}>ℹ️ Jak to działa?</strong><br />
                                Formularz rezerwacji pobiera to ustawienie i ukrywa sloty, które przypadają wcześniej niż <em>dziś + N dni</em>.
                                Zmiana obowiązuje natychmiast po zapisaniu — bez potrzeby przeładowania serwera.
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
