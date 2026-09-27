'use client';
import {useState} from 'react';
import {Moon,Sun} from 'lucide-react';
import {Button} from '@/components/ui/button';

export function ThemeToggle() {
  const [dark,setDark]=useState(()=>document.documentElement.classList.contains('dark'));
  function toggle() {
    const next=!dark;
    document.documentElement.classList.toggle('dark',next);
    document.documentElement.style.colorScheme=next?'dark':'light';
    try {localStorage.setItem('ptu-theme',next?'dark':'light');} catch { /* Theme works even when storage is unavailable. */ }
    setDark(next);
  }
  return <Button variant="outline" onClick={toggle} aria-pressed={dark} aria-label="Modo oscuro">{dark?<Sun size={16}/>:<Moon size={16}/>} {dark?'Modo claro':'Modo oscuro'}</Button>;
}
