"use client";
import Script from 'next/script'

export function WindyMap(className?: string) {
  return(
    <div className={className}>
        <div
            id="windy"
            style={{width: '100%', height: '600px'}}
            data-windywidget="map"
            data-spotid="339553"
            data-appid="ea4746c6ad80abefcfd69bf5b01f729d"
            data-spots="true">
        </div>
        <Script async={true} data-cfasync="false" type="text/javascript" src="https://windy.app/widget3/windy_map_async.js"></Script>
    </div>
 );
}