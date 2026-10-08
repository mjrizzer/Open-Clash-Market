export default function TownHall({level=16,hero=false}:{level?:number,hero?:boolean}) {
  const colors=level>=15?['#d79448','#75432d','#422c29','#f4c878']:level>=13?['#48b2bd','#285b74','#253d55','#a5e5de']:level>=11?['#baa7df','#61507c','#393043','#e0ccfa']:['#d99667','#835a3e','#49352b','#ffd99e'];
  const [roof,wall,shade,light]=colors;
  return <svg viewBox="0 0 500 350" role="img" aria-label={`Illustrated Town Hall ${level}`} className={hero?'village-art hero-art':'village-art'}>
    <ellipse cx="256" cy="286" rx="181" ry="42" fill="#000" opacity=".22"/>
    <path d="M49 251 253 162 453 253 248 339Z" fill="#1f4030"/><path d="M49 251 248 326 453 253 453 267 248 345 49 266Z" fill="#112c24"/>
    <path d="m69 249 184-78 177 82-180 65Z" fill="#345640"/>
    <path d="m206 294 44-14 50 18-48 19Z" fill="#afa686"/><path d="m175 307 25-8 23 9-25 9Z" fill="#8e9676"/>
    {[82,380].map((x,i)=><g key={x} transform={`translate(${x} ${i?185:212})`}><path d="M0 49 14 44 26 50 12 57Z" fill="#182d24"/><path d="M11 27h6v24h-6Z" fill="#79543a"/><path d="M-5 32 14-11 33 32Z" fill="#214f39"/><path d="M0 15 14-19 28 15Z" fill="#397247"/><path d="M4 1 14-27 24 1Z" fill="#55854c"/></g>)}
    <path d="m150 226 103-47 101 48-101 49Z" fill="#2c2927"/>
    <path d="M158 171 253 130 253 267 158 222Z" fill={wall}/><path d="m253 130 94 44v48l-94 45Z" fill={shade}/>
    <path d="m141 167 112-54 117 58-116 54Z" fill={roof}/><path d="m141 167 113 44 116-40-3 20-113 45-111-48Z" fill={shade}/>
    <path d="m159 155 94-43 98 46-96 39Z" fill={light}/><path d="m169 145 85-77 83 82-83 33Z" fill={roof}/><path d="m254 68 83 82-83 33Z" fill={wall}/>
    <path d="m246 73 8-9 89 82-8 9Z" fill={light}/><path d="m183 144 17 7 54-59-1-17Z" fill={light} opacity=".5"/>
    <path d="m223 125 30-14 32 15-32 15Z" fill={shade}/><path d="m224 96 30-14v45l-30-13Z" fill={wall}/><path d="m254 82 31 14v18l-31 13Z" fill={shade}/><path d="m218 92 36-17 37 18-37 18Z" fill={light}/>
    <path d="M248 52h9v31h-9Z" fill="#e9bd67"/><path d="m257 52 39 7-9 12-30-7Z" fill="#dc7045"/>
    <path d="m202 212 22 10v30l-22-10Z" fill="#271f1a"/><path d="m205 215 15 7v26l-15-7Z" fill="#49372a"/>
    <path d="m282 220 19-9v23l-19 9Z" fill="#ffce79"/><path d="m309 207 18-8v23l-18 9Z" fill="#d48c4b"/>
    <path d="m170 199 15 6v18l-15-6Z" fill="#ffcf76"/>
    <path d="m197 241 31 14v7l-31-14Zm-7 4 41 20v7l-41-20Z" fill="#c1aa80"/>
    {[{x:119,y:166},{x:341,y:179}].map(({x,y})=><g key={x} transform={`translate(${x} ${y})`}><path d="M0 18 25 6 46 17v63L24 91 0 78Z" fill={wall}/><path d="m24 29 22-12v63L24 91Z" fill={shade}/><path d="M-5 17 24-20 51 17 24 30Z" fill={roof}/><path d="m24-20 27 37-27 13Z" fill={wall}/><path d="m7 46 9 4v18l-9-5Z" fill={light}/><path d="m31 46 8-4v18l-8 5Z" fill="#1d2323"/><path d="m-5 17 29 13 27-13v9L24 39-5 26Z" fill={light}/></g>)}
    <path d="m98 269 12-21 12 21-12 7Z" fill="#b979dc"/><path d="m110 248 12 21-12 7Z" fill="#7547a6"/>
    <path d="m358 282 13-22 14 22-14 7Z" fill="#ed8cdf"/><path d="m371 260 14 22-14 7Z" fill="#ad57ac"/>
    <circle cx="144" cy="291" r="4" fill="#e5b552"/><circle cx="331" cy="295" r="3" fill="#f8d774"/>
  </svg>;
}
