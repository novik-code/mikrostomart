-- Migration 078: Fix Elżbieta Nowosielska role
-- She is hig. stom. (dental hygienist), not lek. dent. (dentist)
UPDATE staff_signatures
SET staff_name = 'hig. stom. Elżbieta Nowosielska',
    role = 'higienistka'
WHERE staff_name ILIKE '%Elżbieta Nowosielska%'
   OR staff_name ILIKE '%Elzbieta Nowosielska%';
