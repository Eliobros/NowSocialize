export default function Head() {
    return (
      <>
        <title>SocializeNow - Conecte-se com o mundo</title>
        <meta name="description" content="Rede social para conectar pessoas e compartilhar momentos." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="UTF-8" />
  
        {/* SEO Básico */}
        <meta name="keywords" content="rede social, conectar pessoas, compartilhar momentos, SocializeNow" />
        <meta name="author" content="Eliobros Tech" />
        <meta name="robots" content="index, follow" />
  
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SocializeNow - Conecte-se com o mundo" />
        <meta property="og:description" content="Rede social para conectar pessoas e compartilhar momentos." />
        <meta property="og:url" content="https://socializenow.vercel.app" /> {/* substitua pelo seu domínio */}
        <meta property="og:image" content="/socializenow.png" /> {/* substitua pelo link da imagem */}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SocializeNow - Conecte-se com o mundo" />
        <meta name="twitter:description" content="Rede social para conectar pessoas e compartilhar momentos." />
        <meta name="twitter:image" content="https://socializenow.vercel.app/socializenow.png" /> {/* substitua pelo link da imagem */}
        <meta name="twitter:creator" content="@tech12384" /> {/* substitua pelo seu twitter */}
  
        {/* Favicon */}
        <link rel="icon" href="/socializenow.png" />
      </>
    )
  }
