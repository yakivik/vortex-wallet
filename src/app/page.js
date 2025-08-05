"use client"; // Очень важная директива для Next.js

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LogIn, UserPlus, Home, BarChart2, Layers, LogOut, Star, PlusCircle, X, Shield, User, Eye, CheckCircle, RefreshCw } from 'lucide-react';

// --- НАСТРОЙКА FIREBASE ---
import { initializeApp, getApps } from "firebase/app";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot, getDoc, updateDoc, arrayUnion, query, collection, where, getDocs, arrayRemove } from "firebase/firestore";

// =================================================================================
// ВАЖНО: Теперь мы читаем ключи из переменных окружения для безопасности.
// Вы добавите эти переменные в настройках Vercel на этапе публикации.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
// =================================================================================

// --- API Настройки ---
const API_URL_MARKETS = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&sparkline=false';
const API_URL_COIN_DETAILS = 'https://api.coingecko.com/api/v3/coins/';
const REFRESH_INTERVAL = 60000;

// ВАЖНО: НАСТРОЙКА АДМИНИСТРАТОРА
const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID; // Также выносим в переменные окружения

// --- Безопасная инициализация сервисов Firebase ---
// Эта функция гарантирует, что Firebase инициализируется только один раз.
const getFirebaseApp = () => {
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
    }
    return getApps()[0];
};

const app = getFirebaseApp();
const auth = getAuth(app);
const db = getFirestore(app);


// --- Компонент анимированного заголовка ---
const AnimatedTitle = ({ text }) => (
    <h1 className="animated-title text-4xl font-bold mb-4">
        {text.split('').map((char, index) => (
            <span key={index} style={{ animationDelay: `${index * 0.08}s` }}>
                {char === ' ' ? '\u00A0' : char}
            </span>
        ))}
    </h1>
);

// --- Компонент экрана авторизации ---
const AuthScreen = ({ onAuth }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Пожалуйста, заполните все поля.");
            return;
        }
        setIsLoading(true);
        setError("");
        await onAuth(isLoginView, email, password, (err) => {
            setError(err);
            setIsLoading(false);
        });
    };

    return (
        <div className="w-full max-w-md mx-auto p-8 min-h-screen flex flex-col justify-center items-center text-center">
            <div className="welcome-icon-wrapper mb-8"><LogIn size={80} className="welcome-icon"/></div>
            <AnimatedTitle text="Vortex Wallet" />
            <p className="text-gray-400 mb-10">Войдите или создайте аккаунт, чтобы продолжить.</p>
            <div className="w-full glass-card p-8">
                <div className="flex border-b border-white/10 mb-6">
                    <button onClick={() => { setIsLoginView(true); setError(''); }} className={`flex-1 pb-3 font-bold transition-colors ${isLoginView ? 'text-cyan-300 border-b-2 border-cyan-300' : 'text-gray-500 hover:text-white'}`}>Вход</button>
                    <button onClick={() => { setIsLoginView(false); setError(''); }} className={`flex-1 pb-3 font-bold transition-colors ${!isLoginView ? 'text-cyan-300 border-b-2 border-cyan-300' : 'text-gray-500 hover:text-white'}`}>Регистрация</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full glass-input p-4" required />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" className="w-full glass-input p-4" required />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button type="submit" className="w-full primary-button text-lg" disabled={isLoading}>{isLoading ? 'Загрузка...' : (isLoginView ? 'Войти' : 'Создать аккаунт')}</button>
                </form>
            </div>
        </div>
    );
};

// --- Компоненты основного приложения ---

const MainWalletView = ({ holdings, marketCoins }) => {
    const totalPortfolioValue = useMemo(() => {
        if (!marketCoins || marketCoins.length === 0 || !holdings) return 0;
        return holdings.reduce((total, holding) => {
            const coinData = marketCoins.find(c => c.id === holding.id);
            return total + (coinData ? coinData.current_price * holding.quantity : 0);
        }, 0);
    }, [holdings, marketCoins]);

    return (
        <div className="w-full max-w-md mx-auto p-6 min-h-screen flex flex-col">
            <header className="text-center my-8 flex flex-col items-center">
                <div className="p-4 sm:p-8 rounded-2xl glass-card">
                    <span className="text-sm text-cyan-300/80">Общая стоимость портфеля</span>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1>
                </div>
            </header>
            <div className="flex-grow">
                <h2 className="text-xl font-bold mb-4 px-2">Мои Активы</h2>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {holdings && holdings.length > 0 ? holdings.map(holding => {
                        const coinData = marketCoins.find(c => c.id === holding.id);
                        if (!coinData) return null;
                        const value = coinData.current_price * holding.quantity;
                        return (
                            <div key={holding.id} className="glass-card flex items-center justify-between p-4 transition-all hover:scale-[1.02]">
                                <div className="flex items-center gap-4">
                                    {coinData.image ? <img src={coinData.image} alt={coinData.name} className="w-10 h-10" /> : <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Star className="text-yellow-400"/></div>}
                                    <div>
                                        <p className="font-semibold">{coinData.name}</p>
                                        <p className="text-xs text-gray-400">{coinData.symbol.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p className="text-sm text-gray-400">{holding.quantity} {coinData.symbol.toUpperCase()}</p>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-16 glass-card">
                            <p className="text-gray-500">Добавьте монеты из раздела "Рынок".</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MarketView = ({ marketCoins, onTrackCoin, onUntrackCoin, holdings, isLoading }) => {
    const [selectedCoin, setSelectedCoin] = useState(null);
    const [details, setDetails] = useState(null);
    const [isDetailsLoading, setIsDetailsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const handleCoinClick = async (coin) => {
        setSelectedCoin(coin);
        setIsDetailsLoading(true);
        setDetails(null);
        try {
            const res = await fetch(`${API_URL_COIN_DETAILS}${coin.id}?localization=ru`);
            const data = await res.json();
            setDetails(data);
        } catch (error) {
            console.error("Failed to fetch coin details", error);
        } finally {
            setIsDetailsLoading(false);
        }
    };
    
    const isTracked = (coinId) => holdings.some(h => h.id === coinId);

    const filteredCoins = useMemo(() => {
        return marketCoins.filter(coin => 
            coin.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [marketCoins, searchTerm]);

    const cleanDescription = (desc) => {
        if (!desc) return 'Описание недоступно.';
        return desc.replace(/<a[^>]*>([^<]+)<\/a>/g, '$1').split('. ')[0] + '.';
    }

    return (
        <div className="w-full max-w-md mx-auto p-4 md:p-6 min-h-screen flex flex-col">
            {selectedCoin && (
                 <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex justify-center items-center z-50 p-4">
                    <div className="glass-card w-full max-w-md relative">
                        <button onClick={() => setSelectedCoin(null)} className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"><X size={20} /></button>
                        <div className="p-4 space-y-4">
                            {isDetailsLoading ? <p>Загрузка...</p> : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <img src={selectedCoin.image} className="w-10 h-10"/> 
                                        <h2 className="text-2xl font-bold">{selectedCoin.name}</h2>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-3xl font-bold">${selectedCoin.current_price.toLocaleString()}</p>
                                        <p className={`font-semibold text-lg ${selectedCoin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>{selectedCoin.price_change_percentage_24h.toFixed(2)}%</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-white/5 p-3 rounded-lg"><p className="text-gray-400">Капитализация</p><p className="font-bold text-base">${details?.market_data?.market_cap?.usd.toLocaleString() || 'N/A'}</p></div>
                                        <div className="bg-white/5 p-3 rounded-lg"><p className="text-gray-400">Объем (24ч)</p><p className="font-bold text-base">${details?.market_data?.total_volume?.usd.toLocaleString() || 'N/A'}</p></div>
                                    </div>
                                    <p className="text-sm text-gray-400 max-h-24 overflow-y-auto">{cleanDescription(details?.description?.ru || details?.description?.en)}</p>
                                    <button onClick={() => {
                                        if (isTracked(selectedCoin.id)) {
                                            onUntrackCoin(selectedCoin.id)
                                        } else {
                                            onTrackCoin(selectedCoin.id)
                                        }
                                        setSelectedCoin(null);
                                    }} className="w-full primary-button">{isTracked(selectedCoin.id) ? 'Убрать из отслеживания' : 'Отслеживать'}</button>
                                </>
                            )}
                        </div>
                    </div>
                 </div>
            )}
            <header className="text-center my-8">
                <div className="flex justify-center items-center gap-3">
                    <BarChart2 size={36} className="text-cyan-300"/>
                    <h1 className="text-4xl font-bold">Рынок</h1>
                </div>
                 <p className="text-gray-400 flex items-center justify-center gap-2 mt-2">
                    {isLoading ? "Обновление данных..." : "Данные обновлены"} 
                    {isLoading && <RefreshCw size={16} className="animate-spin"/>}
                </p>
            </header>
            <div className="mb-4">
                <input type="text" placeholder="Поиск по названию или тикеру..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full glass-input p-4"/>
            </div>
            <div className="flex-grow space-y-3 overflow-y-auto max-h-[70vh] pr-2">
                {filteredCoins.filter(c => c.id !== 'vex').map(coin => (
                    <div key={coin.id} className="glass-card p-4 flex items-center justify-between transition-all hover:scale-[1.02]">
                        <div className="flex items-center gap-4 flex-grow cursor-pointer" onClick={() => handleCoinClick(coin)}>
                            <img src={coin.image} alt={coin.name} className="w-10 h-10"/>
                            <div>
                                <p className="font-bold">{coin.name} <span className="text-gray-400 text-sm">{coin.symbol.toUpperCase()}</span></p>
                                <p className="text-sm">${coin.current_price.toLocaleString()}</p>
                            </div>
                        </div>
                        <button onClick={(e) => {
                            e.stopPropagation();
                            if (isTracked(coin.id)) {
                                onUntrackCoin(coin.id)
                            } else {
                                onTrackCoin(coin.id)
                            }
                        }} className="p-2 rounded-full text-gray-400 hover:text-white transition-colors">
                            {isTracked(coin.id) ? <CheckCircle className="text-cyan-300"/> : <Eye/>}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HistoryView = () => (
    <div className="w-full max-w-md mx-auto p-4 md:p-6 min-h-screen flex flex-col">
        <header className="text-center my-8"><h1 className="text-4xl font-bold">История</h1><p className="text-gray-400">Этот раздел в разработке</p></header>
    </div>
);

const VerificationView = () => (
     <div className="w-full max-w-md mx-auto p-4 md:p-6 min-h-screen flex flex-col">
        <header className="text-center my-8"><h1 className="text-4xl font-bold">Верификация</h1><p className="text-gray-400">Подтвердите свою личность</p></header>
        <div className="flex-grow glass-card p-8 flex flex-col items-center justify-center text-center">
            <Shield size={64} className="text-cyan-300 mb-4"/>
            <h2 className="text-2xl font-bold mb-2">Этот раздел в разработке</h2>
            <p className="text-gray-400">Здесь будет форма для загрузки документов для прохождения верификации (KYC).</p>
        </div>
    </div>
);

// --- Главный компонент приложения после входа ---
const WalletApp = ({ user, onLogout }) => {
    const [currentView, setCurrentView] = useState('wallet');
    const [holdings, setHoldings] = useState([]);
    const [marketCoins, setMarketCoins] = useState([]);
    const [isLoadingApi, setIsLoadingApi] = useState(true);
    const isAdmin = user.uid === ADMIN_UID;

    useEffect(() => {
        if (!user) return;
        const walletRef = doc(db, "wallets", user.uid);
        const unsubWallet = onSnapshot(walletRef, (docSnap) => {
            if (docSnap.exists()) {
                setHoldings(docSnap.data().holdings || []);
            }
        });
        return () => unsubWallet();
    }, [user]);

    useEffect(() => {
        const fetchMarketData = async () => {
            setIsLoadingApi(true);
            try {
                const response = await fetch(API_URL_MARKETS);
                const data = await response.json();
                const VEX_COIN_DATA = { id: 'vex', name: 'Vortex Coin', symbol: 'VEX', image: null, current_price: 1.25, price_change_percentage_24h: 10.5 };
                setMarketCoins([VEX_COIN_DATA, ...data]);
            } catch (error) {
                console.error("Failed to fetch market data:", error);
            } finally {
                setIsLoadingApi(false);
            }
        };
        fetchMarketData();
        const intervalId = setInterval(fetchMarketData, REFRESH_INTERVAL);
        return () => clearInterval(intervalId);
    }, []);

    const handleTrackCoin = async (coinId) => {
        const walletRef = doc(db, "wallets", user.uid);
        try {
            await updateDoc(walletRef, {
                holdings: arrayUnion({ id: coinId, quantity: 0 })
            });
        } catch (error) { console.error("Error tracking coin:", error); }
    };

    const handleUntrackCoin = async (coinId) => {
        const walletRef = doc(db, "wallets", user.uid);
        const holdingToUntrack = holdings.find(h => h.id === coinId);
        if (holdingToUntrack?.quantity > 0) {
             console.log("Вы не можете убрать монету с ненулевым балансом.");
             return;
        }
        if (holdingToUntrack) {
            try {
                await updateDoc(walletRef, {
                    holdings: arrayRemove(holdingToUntrack)
                });
            } catch (error) { console.error("Error untracking coin:", error); }
        }
    };

    const renderCurrentView = () => {
        switch(currentView) {
            case 'wallet':
                return <MainWalletView holdings={holdings} marketCoins={marketCoins} />;
            case 'market':
                return <MarketView marketCoins={marketCoins} isLoading={isLoadingApi} onTrackCoin={handleTrackCoin} onUntrackCoin={handleUntrackCoin} holdings={holdings} />;
            case 'history':
                return <HistoryView />;
            case 'verification':
                return <VerificationView />;
            default:
                return <MainWalletView holdings={holdings} marketCoins={marketCoins} />;
        }
    }

    return (
        <>
            <div className="relative z-10">
                {renderCurrentView()}
            </div>
            <nav className="bottom-nav">
                <button onClick={() => setCurrentView('wallet')} className={currentView === 'wallet' ? 'active' : ''}><Home /><span>Кошелек</span></button>
                <button onClick={() => setCurrentView('market')} className={currentView === 'market' ? 'active' : ''}><BarChart2 /><span>Рынок</span></button>
                <button onClick={() => setCurrentView('history')} className={currentView === 'history' ? 'active' : ''}><Layers /><span>История</span></button>
                <button onClick={() => setCurrentView('verification')} className={currentView === 'verification' ? 'active' : ''}><User/><span>Профиль</span></button>
                {isAdmin && <button onClick={() => setCurrentView('admin')} className={currentView === 'admin' ? 'active' : ''}><Shield/><span>Админ</span></button>}
                <button onClick={onLogout}><LogOut/><span>Выйти</span></button>
            </nav>
        </>
    );
};

// --- Главный компонент-диспетчер страницы ---
export default function HomePage() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Эффект для отслеживания курсора (для "Авроры")
    useEffect(() => {
        const updateMousePosition = (e) => {
            document.body.style.setProperty('--x', `${e.clientX}px`);
            document.body.style.setProperty('--y', `${e.clientY}px`);
        };
        window.addEventListener('pointermove', updateMousePosition);
        return () => window.removeEventListener('pointermove', updateMousePosition);
    }, []);

    // Эффект для отслеживания состояния авторизации
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAuth = async (isLogin, email, password, onError) => {
        try {
            if (isLogin) {
                await setPersistence(auth, browserLocalPersistence);
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const newUser = userCredential.user;
                // Создаем документы для нового пользователя
                await setDoc(doc(db, "users", newUser.uid), {
                    userId: newUser.uid, 
                    email: newUser.email, 
                    registrationDate: new Date().toISOString(), 
                    verificationStatus: "new",
                });
                await setDoc(doc(db, "wallets", newUser.uid), { 
                    userId: newUser.uid, 
                    holdings: [{ id: 'vex', quantity: 100 }] 
                });
            }
        } catch (err) {
            onError("Ошибка: " + (err.code === 'auth/invalid-credential' ? 'неверный email или пароль.' : err.message));
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="w-full h-screen flex justify-center items-center">
                    <div className="welcome-icon-wrapper"><LogIn size={80} className="welcome-icon"/></div>
                </div>
            );
        }
        return user ? <WalletApp user={user} onLogout={handleLogout} /> : <AuthScreen onAuth={handleAuth} />;
    };

    return (
        <main className="relative min-h-screen flex flex-col items-center justify-center bg-black text-white">
            {renderContent()}
        </main>
    );
}
