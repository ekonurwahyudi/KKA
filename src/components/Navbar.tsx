'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayoutDashboard, Wallet, BarChart3, LogOut, Database, ChevronDown, Building2, FileCode, Settings, FolderOpen, Users, UserCog, CreditCard, Menu, X, UserCheck, Banknote, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

// Weather icon component using custom images
function WeatherIcon({ code, className }: { code: number; className?: string }) {
  // WMO Weather codes: https://open-meteo.com/en/docs
  let iconSrc = '/sun.png'
  if (code >= 1 && code <= 3) iconSrc = '/cloud.png'
  if (code >= 45 && code <= 48) iconSrc = '/cloud.png'
  if (code >= 51 && code <= 99) iconSrc = '/rain.png'
  
  return <Image src={iconSrc} alt="Weather" width={24} height={24} className={className} />
}

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null)
  const [currentDate, setCurrentDate] = useState('')
  const [userAvatar, setUserAvatar] = useState('/avatar.png')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Load user profile (avatar, name, email)
    if (session?.user?.email) {
      fetch('/api/user/profile')
        .then(r => r.json())
        .then(data => {
          if (data && !data.error) {
            setUserAvatar(data.avatar || '/avatar.png')
            setUserName(data.name || '')
            setUserEmail(data.email || '')
          }
        })
        .catch(() => {})
    }
  }, [session])

  useEffect(() => {
    // Set current date
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }
    setCurrentDate(now.toLocaleDateString('id-ID', options))

    // Fetch Jakarta weather from Open-Meteo (free, no API key needed)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=-6.230358&longitude=106.8157504&current=temperature_2m,weather_code')
      .then(res => res.json())
      .then(data => {
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code
          })
        }
      })
      .catch(() => {})
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/budget', label: 'Anggaran', icon: FolderOpen },
    { href: '/dashboard/transaction', label: 'Pencatatan', icon: Wallet },
    { href: '/dashboard/imprest-fund', label: 'Imprest Fund', icon: CreditCard },
    { href: '/dashboard/rra', label: 'RRA', icon: ArrowRightLeft },
    { href: '/dashboard/cash', label: 'Cash', icon: Banknote },
    { href: '/dashboard/report', label: 'Laporan', icon: BarChart3 },
  ]

  const masterItems = [
    { href: '/dashboard/master/gl-account', label: 'GL Account', icon: FileCode },
    { href: '/dashboard/master/regional', label: 'Regional', icon: Building2 },
    { href: '/dashboard/master/vendor', label: 'Vendor', icon: Users },
    { href: '/dashboard/master/karyawan', label: 'Karyawan', icon: UserCheck },
    { href: '/dashboard/master/pic-anggaran', label: 'PIC Anggaran', icon: UserCog },
    { href: '/dashboard/master/imprest-fund-card', label: 'Imprest Fund Card', icon: CreditCard },
  ]

  return (
    <nav className="bg-white">
      {/* Top Header */}
      <div className="border-b">
        <div className="px-4 md:px-[120px] flex justify-between items-center h-14">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            <Link href="/dashboard" className="flex items-center">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                width={120} 
                height={40} 
                priority
                className="h-6 md:h-8 w-auto"
              />
            </Link>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Weather & Date - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg">
              {weather && (
                <div className="flex items-center gap-2">
                  <WeatherIcon code={weather.code} className="h-6 w-6" />
                  <span className="text-sm font-medium">{weather.temp}°C</span>
                </div>
              )}
              <div className="h-4 w-px bg-gray-300" />
              <span className="text-sm text-muted-foreground">{currentDate}</span>
            </div>

            {/* Weather only on mobile */}
            {weather && (
              <div className="md:hidden flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg">
                <WeatherIcon code={weather.code} className="h-5 w-5" />
                <span className="text-xs font-medium">{weather.temp}°C</span>
              </div>
            )}
            
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 md:gap-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                  <Image 
                    src={userAvatar} 
                    alt="Avatar" 
                    width={36} 
                    height={36} 
                    className="rounded-lg w-8 h-8 md:w-9 md:h-9"
                  />
                  <div className="hidden md:block text-left">
                    <p className="font-medium text-sm">{userName || session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{userEmail || session?.user?.email}</p>
                  </div>
                  <ChevronDown className="hidden md:block h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings" className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Pengaturan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Desktop Navigation Tabs */}
      <div className="hidden md:block border-b">
        <div className="px-[120px] py-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 w-fit">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all",
                    isActive 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
            
            {/* Master Data Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all",
                  pathname.startsWith('/dashboard/master')
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}>
                  <Database className="h-4 w-4" />
                  Master Data
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {masterItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-center gap-2 cursor-pointer">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-white">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                    isActive 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
            
            {/* Master Data Section */}
            <div className="pt-2 border-t mt-2">
              <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Master Data</p>
              {masterItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                      isActive 
                        ? "bg-gray-100 text-gray-900" 
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
