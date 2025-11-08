"use client";
import Script from 'next/script'
import { useState, useEffect } from 'react';
export function WindyMap() {
  const [hasLoaded, setHasLoaded]=useState<boolean>(false)
  function componentDidMount () {
      const script = document.createElement("script");
      script.src = "https://windy.app/widget3/windy_map_async.js";
      script.async = true;
      document.body.appendChild(script);
  }

  useEffect(()=>{
    if(hasLoaded)
      return
    componentDidMount()
  })
  return(
    <div>
        <div
            id="windy"
            style={{width: '100%', height: '600px'}}
            data-windywidget="map"
            data-spotid="339553"
            data-appid="ea4746c6ad80abefcfd69bf5b01f729d"
            data-spots="true">
        </div>
        
    </div>
 );
}