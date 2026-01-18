"use client";

interface StudioResultsProps {
    resultImage: string;
    onReset: () => void;
}

export default function StudioResults({ resultImage, onReset }: StudioResultsProps) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-white p-6">
            <h2 className="text-2xl mb-4">Twój Nowy Uśmiech</h2>

            <div className="w-full max-w-lg aspect-square bg-gray-800 rounded-xl overflow-hidden mb-6">
                <img src={resultImage} className="w-full h-full object-cover" alt="Result" />
            </div>

            <button
                onClick={onReset}
                className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200"
            >
                Spróbuj Ponownie
            </button>
        </div>
    );
}
