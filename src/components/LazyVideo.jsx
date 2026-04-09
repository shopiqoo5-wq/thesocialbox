import React, { useRef, useEffect, useState } from 'react';

const LazyVideo = ({ src, className, ...props }) => {
  const videoRef = useRef(null);
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersecting(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay
      loop
      muted
      playsInline
      {...props}
    >
      {isIntersecting && <source src={src} type="video/mp4" />}
    </video>
  );
};

export default LazyVideo;
