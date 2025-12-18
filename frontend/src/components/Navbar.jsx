
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle, FaBars, FaTimes, FaSun, FaMoon, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { useState, useEffect } from 'react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const NavItem = ({ to, children, primary = false }) => (
        <Link
            to={to}
            className={primary ? "nav-link-active" : "nav-link"}
        >
            {children}
        </Link>
    );

    return (
        <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'glass-strong py-2' : 'bg-transparent py-4'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    {/* Logo Section */}
                    <div className="flex items-center gap-2">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                E
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-gradient-premium group-hover:opacity-80 transition-opacity">
                                GovBot
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <NavItem to="/">Home</NavItem>

                            {user && (
                                <>
                                    {user.role !== 'admin' && <NavItem to="/chat">Chat Service</NavItem>}
                                    <NavItem to={user.role === 'admin' ? '/admin' : '/dashboard'} primary>
                                        {user.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
                                    </NavItem>
                                </>
                            )}
                        </div>

                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>

                        <div className="flex items-center gap-4">
                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all transform hover:rotate-12"
                                aria-label="Toggle Theme"
                            >
                                {theme === 'dark' ? <FaMoon size={20} className="text-violet-300" /> : <FaSun size={20} className="text-amber-500" />}
                            </button>

                            {user ? (
                                <div className="flex items-center gap-3">
                                    {user.role !== 'admin' && (
                                        <Link to="/settings" className="p-2 text-gray-500 hover:text-violet-600 transition-colors" title="Settings">
                                            <FaCog size={20} />
                                        </Link>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group"
                                    >
                                        <span>Logout</span>
                                        <FaSignOutAlt className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Link to="/login" className="px-5 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                                        Sign In
                                    </Link>
                                    <Link to="/register" className="px-6 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
                                        Get Started
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-gray-600 dark:text-gray-300"
                        >
                            {theme === 'dark' ? <FaMoon size={20} /> : <FaSun size={20} />}
                        </button>
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 text-gray-700 dark:text-gray-200 focus:outline-none"
                        >
                            {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 animate-slide-down shadow-xl">
                    <div className="px-4 py-6 space-y-4">
                        <Link to="/" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-xl text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5">Home</Link>
                        {user ? (
                            <>
                                <Link to="/chat" onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-xl text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5">Chat Service</Link>
                                <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} onClick={() => setIsOpen(false)} className="block px-4 py-3 rounded-xl text-base font-medium bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 text-violet-700 dark:text-violet-300">
                                    {user.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}
                                </Link>
                                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">Logout</button>
                            </>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <Link to="/login" onClick={() => setIsOpen(false)} className="flex justify-center px-4 py-3 rounded-xl text-base font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Login</Link>
                                <Link to="/register" onClick={() => setIsOpen(false)} className="flex justify-center px-4 py-3 rounded-xl text-base font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md">Get Started</Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
