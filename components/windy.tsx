"use client";
import Script from 'next/script'
import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

export function WindyMap({ className }: { className?: string } = {}) {
  const [mounted, setMounted] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const windyContainerRef = useRef<HTMLDivElement>(null);
  const initAttemptsRef = useRef(0);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    setMounted(true);
    
    // Filter out specific console errors from Windy widget
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (args[0]?.includes?.('building') && args[0]?.includes?.('openmaptiles')) {
        return;
      }
      originalError.apply(console, args);
    };

    // Function to force Windy widget reinitialization
    const forceReinit = () => {
      if (!windyContainerRef.current) return;
      
      const element = windyContainerRef.current;
      
      // Clear the container completely
      element.innerHTML = '';
      
      // Remove all data attributes
      element.removeAttribute('data-windywidget');
      element.removeAttribute('data-spotid');
      element.removeAttribute('data-appid');
      element.removeAttribute('data-spots');
      
      // Force a reflow
      void element.offsetHeight;
      
      // Re-add attributes after a brief delay
      setTimeout(() => {
        if (!windyContainerRef.current) return;
        
        const el = windyContainerRef.current;
        el.setAttribute('data-windywidget', 'map');
        el.setAttribute('data-spotid', '339553');
        el.setAttribute('data-appid', 'ea4746c6ad80abefcfd69bf5b01f729d');
        el.setAttribute('data-spots', 'true');
        
        // Try to manually trigger Windy initialization if available
        if ((window as any).windy && typeof (window as any).windy.init === 'function') {
          try {
            (window as any).windy.init();
          } catch (e) {
            // Ignore errors
          }
        }
      }, 50);
    };

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="https://windy.app/widget3/windy_map_async.js"]');
    
    if (existingScript) {
      // Script already loaded, mark as ready
      setScriptReady(true);
      // Force a new key to recreate the element
      setMapKey(prev => prev + 1);
      // Try multiple times to reinitialize (Windy needs time to detect the element)
      const reinitTimeouts = [
        setTimeout(forceReinit, 100),
        setTimeout(forceReinit, 500),
        setTimeout(forceReinit, 1000),
        setTimeout(forceReinit, 2000),
      ];
      
      return () => {
        reinitTimeouts.forEach(clearTimeout);
        console.error = originalError;
        initAttemptsRef.current = 0;
      };
    }

    return () => {
      console.error = originalError;
      initAttemptsRef.current = 0;
    };
  }, []);

  const handleScriptLoad = () => {
    setScriptReady(true);
    // Force reinitialization after script loads - try multiple times
    const reinitTimeouts = [
      setTimeout(() => {
        if (windyContainerRef.current) {
          const element = windyContainerRef.current;
          // Trigger reinitialization
          const widgetAttr = element.getAttribute('data-windywidget');
          if (widgetAttr) {
            element.removeAttribute('data-windywidget');
            requestAnimationFrame(() => {
              if (windyContainerRef.current) {
                windyContainerRef.current.setAttribute('data-windywidget', widgetAttr);
              }
            });
          }
        }
      }, 300),
      setTimeout(() => {
        if (windyContainerRef.current) {
          const element = windyContainerRef.current;
          const widgetAttr = element.getAttribute('data-windywidget');
          if (widgetAttr) {
            element.removeAttribute('data-windywidget');
            requestAnimationFrame(() => {
              if (windyContainerRef.current) {
                windyContainerRef.current.setAttribute('data-windywidget', widgetAttr);
              }
            });
          }
        }
      }, 1000),
    ];
  };

  if (!mounted) {
    return (
      <div className={cn(className, "w-full h-[400px] sm:h-[500px] lg:h-[600px]")}>
        <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return(
    <div className={cn(className, "w-full")}>
      <Script
        src="https://windy.app/widget3/windy_map_async.js"
        strategy="lazyOnload"
        onLoad={handleScriptLoad}
        onError={(e) => {
          console.error('Windy script failed to load:', e);
        }}
      />
      <div
        ref={windyContainerRef}
        id={`windy-${mapKey}`}
        key={`windy-${mapKey}`}
        className="w-full h-[400px] sm:h-[500px] lg:h-[600px]"
        style={{backgroundColor: scriptReady ? 'transparent' : '#f3f4f6'}}
            data-windywidget="map"
            data-spotid="339553"
            data-appid="ea4746c6ad80abefcfd69bf5b01f729d"
            data-spots="true">
        </div>
    </div>
 );
}