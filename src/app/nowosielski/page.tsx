export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default function BlogDebug() {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'red',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            fontWeight: 'bold',
            zIndex: 99999,
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw'
        }}>
            DEBUG: CZY WIDZISZ TEN CZERWONY EKRAN?
            <br />
            (DEPLOYMENT TEST)
        </div>
    );
}
