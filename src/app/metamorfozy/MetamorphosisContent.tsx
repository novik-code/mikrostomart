"use client";

import MetamorphosisGallery from "@/components/MetamorphosisGallery";
import { useSearchParams } from "next/navigation";

export default function MetamorphosisContent() {
    const searchParams = useSearchParams();
    const slideParam = searchParams.get("slide");
    const initialIndex = slideParam ? parseInt(slideParam, 10) : 0;

    return <MetamorphosisGallery initialIndex={isNaN(initialIndex) ? 0 : initialIndex} />;
}
