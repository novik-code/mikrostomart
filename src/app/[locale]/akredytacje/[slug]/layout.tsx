import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { buildHreflangAlternates, buildCanonical, breadcrumbHref, localizedBreadcrumb } from '@/lib/seo';
import { AKREDYTACJE, getAkredytacjaBySlug } from '@/data/akredytacje';

interface Params {
    locale: string;
    slug: string;
}

export async function generateStaticParams() {
    const locales = ['pl', 'en', 'de', 'ua'];
    return locales.flatMap((locale) =>
        AKREDYTACJE.map((acc) => ({ locale, slug: acc.slug }))
    );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const entry = getAkredytacjaBySlug(slug);
    if (!entry) return {};

    const t = await getTranslations({ locale, namespace: 'akredytacje' });
    const path = `/akredytacje/${slug}`;

    return {
        title: { absolute: t(`${slug}.metaTitle`) },
        description: t(`${slug}.metaDescription`),
        alternates: {
            canonical: buildCanonical(locale, path),
            languages: buildHreflangAlternates(path),
        },
        openGraph: {
            title: t(`${slug}.metaTitle`),
            description: t(`${slug}.metaDescription`),
            url: buildCanonical(locale, path),
            type: 'article',
        },
    };
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<Params> }) {
    const { locale, slug } = await params;
    const entry = getAkredytacjaBySlug(slug);
    if (!entry) notFound();

    const t = await getTranslations({ locale, namespace: 'akredytacje' });

    const breadcrumb = localizedBreadcrumb(locale, [
        { key: 'home', url: breadcrumbHref(locale, '/') },
        { key: 'akredytacje', url: breadcrumbHref(locale, '/akredytacje') },
        { name: t(`${slug}.label`) },
    ]);

    // Organization schema (EducationalOrganization or MedicalOrganization)
    const orgSchema = {
        '@context': 'https://schema.org',
        '@type': entry.schemaType,
        name: t(`${slug}.fullName`),
        description: t(`${slug}.hero`),
        ...(entry.externalUrl ? { url: entry.externalUrl } : {}),
        ...(entry.foundedYear ? { foundingDate: String(entry.foundedYear) } : {}),
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
            {children}
        </>
    );
}
