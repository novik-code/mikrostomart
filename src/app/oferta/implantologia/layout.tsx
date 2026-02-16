import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Implanty Opole - implanty zębów Opole, implanty cennik Opole",
    description: "Profesjonalne zabiegi implantacji w Opolu. Precyzja, cyfrowe planowanie i bezbolesne leczenie w Mikrostomart. Sprawdź cennik i umów się na wizytę.",
};

export default function ImplantologiaLayout({ children }: { children: React.ReactNode }) {
    return children;
}
