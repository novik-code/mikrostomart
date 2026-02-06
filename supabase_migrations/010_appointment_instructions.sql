-- Migration 010: Appointment Instructions Landing Pages
-- Purpose: Store customizable preparation instructions for each appointment type
-- Date: 2026-02-06

-- Create appointment_instructions table
CREATE TABLE IF NOT EXISTS appointment_instructions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Unique identifier (URL slug)
    appointment_type VARCHAR(100) UNIQUE NOT NULL,
    
    -- Display content
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    icon VARCHAR(50), -- Emoji for visual identity
    
    -- Main content (HTML from rich text editor)
    content TEXT NOT NULL,
    
    -- Structured preparation info
    preparation_time VARCHAR(100), -- "2 godziny przed wizytą"
    what_to_bring TEXT[], -- Array of items to bring
    important_notes TEXT[], -- Array of important points
    
    -- SEO
    meta_description VARCHAR(500),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on appointment_type for fast lookups
CREATE INDEX IF NOT EXISTS idx_appointment_instructions_type 
    ON appointment_instructions(appointment_type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_appointment_instructions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_instructions_updated_at
    BEFORE UPDATE ON appointment_instructions
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_instructions_updated_at();

-- Seed initial data for all appointment types
INSERT INTO appointment_instructions (
    appointment_type, 
    title, 
    subtitle, 
    icon, 
    content, 
    preparation_time,
    what_to_bring,
    important_notes
) VALUES 
-- Chirurgia
(
    'chirurgia',
    'Zabieg Chirurgiczny',
    'Jak przygotować się do zabiegu',
    '⚕️',
    '<h2>Przed zabiegiem</h2>
    <p><strong>Prosimy NIE jeść i NIE pić</strong> co najmniej <strong>2 godziny przed</strong> planowanym zabiegiem.</p>
    <p>W dniu zabiegu możesz przyjmować stałe leki (np. na ciśnienie) z niewielką ilością wody.</p>
    
    <h2>W dniu zabiegu</h2>
    <ul>
        <li>Przyjdź punktualnie - zabieg wymaga przygotowania</li>
        <li>Ubierz się wygodnie</li>
        <li>Jeśli czujesz niepokój, powiadom nas - możemy podać sedację</li>
    </ul>
    
    <h2>Po zabiegu</h2>
    <p>Przez pierwsze 24h po zabiegu:</p>
    <ul>
        <li><strong>NIE</strong> pij przez słomkę</li>
        <li><strong>NIE</strong> płucz ust intensywnie</li>
        <li><strong>NIE</strong> pal papierosów</li>
        <li>Jedz miękkie, letnie posiłki</li>
        <li>W razie bólu - przyjmij przepisane leki przeciwbólowe</li>
    </ul>',
    '2 godziny przed',
    ARRAY['Dowód osobisty', 'Aktualna lista leków', 'Skierowanie (jeśli dotyczy)'],
    ARRAY['NIE jeść 2h przed', 'Punktualne przybycie', 'Unikaj alkoholu 24h przed i po']
),

-- Pierwsza wizyta
(
    'pierwsza-wizyta',
    'Pierwsza Wizyta',
    'Witamy w Mikrostomart!',
    '👋',
    '<h2>Witamy!</h2>
    <p>Cieszymy się, że wybrałeś Mikrostomart. Twoja pierwsza wizyta to okazja do poznania zespołu i omówienia Twoich potrzeb.</p>
    
    <h2>Przebieg wizyty</h2>
    <ol>
        <li><strong>Wypełnienie ankiety medycznej</strong> (5 min)</li>
        <li><strong>Badanie stomatologiczne</strong> pod mikroskopem (15-20 min)</li>
        <li><strong>Konsultacja i plan leczenia</strong> (10 min)</li>
        <li><strong>Wycena i ustalenie terminów</strong> (5 min)</li>
    </ol>
    
    <h2>Co warto wiedzieć</h2>
    <ul>
        <li>Wizyta trwa ok. <strong>40 minut</strong></li>
        <li>Nie wymaga szczególnego przygotowania</li>
        <li>Możesz zadawać pytania w każdym momencie</li>
        <li>Otrzymasz szczegółowy plan leczenia</li>
    </ul>',
    NULL,
    ARRAY['Dowód osobisty', 'Wcześniejsze zdjęcia RTG (jeśli posiadasz)', 'Lista przyjmowanych leków'],
    ARRAY['Przyjdź 10 minut wcześniej', 'Możesz zapytać o wszystko', 'NFZ/prywatnie - wybór należy do Ciebie']
),

-- Protetyka
(
    'protetyka',
    'Wizyta Protetyczna',
    'Korony, mosty, protezy',
    '🦷',
    '<h2>Przygotowanie do wizyty</h2>
    <p>Wizyta protetyczna może obejmować pobieranie wycisków, przymiarki lub osadzenie stałych uzupełnień.</p>
    
    <h2>Co będzie się działo</h2>
    <ul>
        <li>Sprawdzenie stopnia zaawansowania prac</li>
        <li>Pobieranie wycisków (jeśli potrzebne)</li>
        <li>Przymiarki konstrukcji protetycznych</li>
        <li>Osadzenie gotowych uzupełnień</li>
    </ul>
    
    <h2>Po wizycie</h2>
    <p>Jeśli otrzymasz tymczasową koronę:</p>
    <ul>
        <li>Unikaj twardych pokarmów</li>
        <li>Szczotkuj delikatnie w okolicy korony</li>
        <li>W razie jej wypadnięcia - nie panikuj, umów wizytę</li>
    </ul>',
    NULL,
    ARRAY['Dowód osobisty'],
    ARRAY['Wizyta może trwać 30-60 min', 'Po osadzeniu - kontrola za tydzień']
),

-- Endodoncja
(
    'endodoncja',
    'Leczenie Kanałowe',
    'Endodoncja mikroskopowa',
    '🔬',
    '<h2>Czym jest leczenie kanałowe?</h2>
    <p>Leczenie polega na usunięciu zainfekowanej miazgi z wnętrza zęba i wypełnieniu kanałów. Wykonujemy je pod mikroskopem dla maksymalnej precyzji.</p>
    
    <h2>Przebieg zabiegu</h2>
    <ol>
        <li><strong>Znieczulenie</strong> - ząb będzie całkowicie znieczulony</li>
        <li><strong>Oczyszczenie kanałów</strong> - usuwamy zainfekowaną tkankę</li>
        <li><strong>Wypełnienie</strong> - uszczelniamy kanały</li>
        <li><strong>Odbudowa korony</strong> - w tej samej lub kolejnej wizycie</li>
    </ol>
    
    <h2>Po zabiegu</h2>
    <ul>
        <li>Przez kilka dni może być lekka wrażliwość - to normalne</li>
        <li>Możesz przyjąć Ibuprofen jeśli potrzeba</li>
        <li>Unikaj gryzienia twardych rzeczy tym zębem przez 24h</li>
    </ul>',
    NULL,
    ARRAY['Dowód osobisty'],
    ARRAY['Zabieg bezbolesny dzięki znieczuleniu', 'Kontrola za 1-2 tygodnie']
),

-- Konsultacja
(
    'konsultacja',
    'Konsultacja Stomatologiczna',
    'Omówimy Twoje potrzeby',
    '💬',
    '<h2>Czym jest konsultacja?</h2>
    <p>To spotkanie, podczas którego omówimy Twoje dolegliwości, wykonamy badanie i zaproponujemy plan leczenia.</p>
    
    <h2>Co przygotować?</h2>
    <ul>
        <li>Lista pytań, które chcesz zadać</li>
        <li>Informacje o wcześniejszym leczeniu</li>
        <li>Zdjęcia RTG (jeśli posiadasz)</li>
    </ul>
    
    <h2>Przebieg konsultacji</h2>
    <ol>
        <li><strong>Wywiad</strong> - opowiedz o swoich dolegliwościach</li>
        <li><strong>Badanie</strong> - sprawdzimy stan zdrowia jamy ustnej</li>
        <li><strong>Diagnoza</strong> - wyjaśnimy co wymaga leczenia</li>
        <li><strong>Plan i wycena</strong> - otrzymasz szczegółową ofertę</li>
    </ol>',
    NULL,
    ARRAY['Dowód osobisty', 'Wcześniejsze wyniki badań (jeśli są)'],
    ARRAY['Konsultacja to rozmowa - nie zabieg', 'Czas trwania: 20-30 min']
),

-- Zachowawcza
(
    'zachowawcze',
    'Stomatologia Zachowawcza',
    'Leczenie próchnicy, wypełnienia',
    '🦷',
    '<h2>Czym jest stomatologia zachowawcza?</h2>
    <p>To leczenie próchnicy i inne zabiegi mające na celu zachowanie naturalnych zębów.</p>
    
    <h2>Co będzie się działo?</h2>
    <ul>
        <li>Usunięcie próchnicy</li>
        <li>Oczyszczenie ubytku</li>
        <li>Wypełnienie kompozytowe (kolor dopasowany do zębów)</li>
        <li>Wygładzenie i dopasowanie zwarcia</li>
    </ul>
    
    <h2>Po zabiegu</h2>
    <ul>
        <li>Możesz jeść od razu po ustąpieniu znieczulenia (2-3h)</li>
        <li>Wypełnienie może być wrażliwe przez pierwszy dzień - to normalne</li>
        <li>Szczotkuj zęby jak zwykle</li>
    </ul>',
    NULL,
    ARRAY['Dowód osobisty'],
    ARRAY['Zabieg bezbolesny', 'Znieczulenie lokalne', 'Czas: 30-60 min']
),

-- Ortodoncja
(
    'ortodoncja',
    'Wizyta Ortodontyczna',
    'Aparat, nakładki, kontrola',
    '🦷',
    '<h2>Przygotowanie</h2>
    <p>Przed wizytą dokładnie wyczyść zęby i aparat (jeśli go nosisz).</p>
    
    <h2>Co może się dziać na wizycie?</h2>
    <ul>
        <li>Założenie/wymiana łuków ortodontycznych</li>
        <li>Kontrola postępów leczenia</li>
        <li>Dodanie/usunięcie elementów aparatu</li>
        <li>Zmiana gumek/ligatur</li>
    </ul>
    
    <h2>Po wizycie</h2>
    <ul>
        <li>Przez 1-2 dni może być dyskomfort - to normalne</li>
        <li>Zęby mogą być wrażliwe - jedz miękkie pokarmy</li>
        <li>Szczotkuj aparat po każdym posiłku</li>
    </ul>',
    NULL,
    ARRAY['Dowód osobisty', 'Szczoteczka do zębów', 'Wosek ortodontyczny (jeśli używasz)'],
    ARRAY['Dokładnie wyczyść zęby przed wizytą', 'Unikaj twardych pokarmów przez 24h po']
),

-- Higienizacja
(
    'higienizacja',
    'Higienizacja Jamy Ustnej',
    'Profesjonalne czyszczenie zębów',
    '✨',
    '<h2>Czym jest higienizacja?</h2>
    <p>To profesjonalne czyszczenie zębów, usuwanie kamienia nazębnego i fluoryzacja dla ochrony szkliwa.</p>
    
    <h2>Przebieg zabiegu</h2>
    <ol>
        <li><strong>Usunięcie kamienia</strong> ultradźwiękami</li>
        <li><strong>Piaskowanie</strong> - usunięcie przebarwień</li>
        <li><strong>Fluoryzacja</strong> - wzmocnienie szkliwa</li>
        <li><strong>Instruktaż higieny</strong> - pokażemy jak dbać o zęby</li>
    </ol>
    
    <h2>Po zabiegu</h2>
    <ul>
        <li>Przez 1h nie jedz i nie pij (fluoryzacja musi wchłonąć się)</li>
        <li>Unikaj barwiących napojów przez 24h (kawa, herbata, wino)</li>
        <li>Zęby mogą być wrażliwe przez 1-2 dni</li>
    </ul>',
    NULL,
    ARRAY['Dowód osobisty'],
    ARRAY['Zabieg bezbolesny', 'NIE jeść 1h po', 'Zalecane co 6 miesięcy']
),

-- Kontrola
(
    'kontrola',
    'Wizyta Kontrolna',
    'Sprawdzenie stanu jamy ustnej',
    '📋',
    '<h2>Czym jest wizyta kontrolna?</h2>
    <p>To krótkie spotkanie (15-20 min) podczas którego lekarz sprawdza czy leczenie przebiega prawidłowo lub czy nie pojawiły się nowe problemy.</p>
    
    <h2>Co będzie się działo?</h2>
    <ul>
        <li>Oględziny jamy ustnej</li>
        <li>Sprawdzenie gojenia (jeśli był zabieg)</li>
        <li>Ocena skuteczności leczenia</li>
        <li>Ewentualne zdjęcie szwów</li>
    </ul>
    
    <h2>Nie wymaga przygotowania</h2>
    <p>Wystarczy, że przyjdziesz na umówioną godzinę.</p>',
    NULL,
    ARRAY['Dowód osobisty'],
    ARRAY['Krótka wizyta (15-20 min)', 'Bez zabiegów', 'Ważna dla prawidłowego leczenia']
),

-- Laser
(
    'laser',
    'Zabieg Laserowy',
    'Nowoczesne leczenie laserem',
    '💡',
    '<h2>Leczenie laserem diodowym</h2>
    <p>Laser stosujemy w leczeniu dziąseł, wybielaniu, sterylizacji kanałów i małych zabiegach chirurgicznych.</p>
    
    <h2>Zalety lasera</h2>
    <ul>
        <li><strong>Bezbolesność</strong> - większość zabiegów bez znieczulenia</li>
        <li><strong>Szybkie gojenie</strong> - laser sterylizuje i przyspiesza regenerację</li>
        <li><strong>Precyzja</strong> - tylko chore tkanki</li>
        <li><strong>Bez krwawienia</strong> - laser koaguluje naczynia</li>
    </ul>
    
    <h2>Po zabiegu</h2>
    <ul>
        <li>Minimal dyskomfort</li>
        <li>Szybkie gojenie (2-3 dni)</li>
        <li>Unikaj gorących napojów przez 24h</li>
    </ul>',
    NULL,
    ARRAY['Dowód osobisty'],
    ARRAY['Nowoczesna technologia', 'Bezbolesny zabieg', 'Szybkie gojenie']
);

-- Comments
COMMENT ON TABLE appointment_instructions IS 'Landing page content for each appointment type - editable via admin CMS';
COMMENT ON COLUMN appointment_instructions.appointment_type IS 'URL slug and unique identifier (e.g. chirurgia, pierwsza-wizyta)';
COMMENT ON COLUMN appointment_instructions.content IS 'HTML content from rich text editor';
COMMENT ON COLUMN appointment_instructions.what_to_bring IS 'Array of items patient should bring';
COMMENT ON COLUMN appointment_instructions.important_notes IS 'Key points to highlight (badges on page)';
