
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { UserPhoto } from '../types';

interface PhotoWallProps {
  photos: UserPhoto[];
  onClose: () => void;
}

const PhotoWall: React.FC<PhotoWallProps> = ({ photos, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || photos.length === 0) return;

    const scene = new THREE.Scene();
    // 增加视野角度，使胶卷更有环绕感
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    const updateSize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    containerRef.current.appendChild(renderer.domElement);
    camera.position.set(0, 0, 12);

    const reelGroup = new THREE.Group();
    scene.add(reelGroup);

    const loader = new THREE.TextureLoader();
    const photoMeshes: THREE.Mesh[] = [];
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // --- 胶卷轴参数 ---
    const radius = 8;
    const frameWidth = 3.5;
    const frameHeight = 2.5;
    const spacing = 0.5; // 帧间距
    const totalPhotos = Math.max(photos.length, 6); // 保证胶卷有一定长度
    const arcStep = (frameWidth + spacing) / radius;

    photos.forEach((p, i) => {
      const angle = i * arcStep - (photos.length * arcStep) / 2;
      
      const frameGroup = new THREE.Group();

      // 1. 胶卷底色 (黑色带子)
      const stripBg = new THREE.Mesh(
        new THREE.PlaneGeometry(frameWidth + 0.2, frameHeight + 0.8),
        new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.FrontSide })
      );
      frameGroup.add(stripBg);

      // 2. 胶卷齿孔 (上下边缘的装饰)
      const holeCount = 8;
      const holeSize = 0.15;
      for (let j = 0; j < holeCount; j++) {
        const hx = -frameWidth/2 + (j * (frameWidth/(holeCount-1)));
        const createHole = (y: number) => {
          const hole = new THREE.Mesh(
            new THREE.PlaneGeometry(holeSize, holeSize),
            new THREE.MeshBasicMaterial({ color: 0x333333 })
          );
          hole.position.set(hx, y, 0.01);
          return hole;
        };
        frameGroup.add(createHole(frameHeight/2 + 0.25));
        frameGroup.add(createHole(-frameHeight/2 - 0.25));
      }

      // 3. 用户照片
      const tex = loader.load(p.url);
      const photoMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(frameWidth * 0.9, frameHeight * 0.9),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide })
      );
      photoMesh.position.z = 0.02; // 稍微浮起
      photoMesh.userData = { url: p.url };
      frameGroup.add(photoMesh);
      photoMeshes.push(photoMesh);

      // 4. 摆放位置：圆柱坐标
      frameGroup.position.set(
        Math.sin(angle) * radius,
        Math.sin(i * 0.5) * 0.3, // 轻微起伏感
        Math.cos(angle) * radius - radius
      );
      frameGroup.lookAt(0, 0, 5); // 面向前方稍远点，使弧度平滑

      reelGroup.add(frameGroup);
    });

    // 交互逻辑
    let targetRot = 0, currentRot = 0, dragging = false, lastX = 0;
    
    const onDown = (e: any) => { 
      dragging = true; 
      lastX = e.touches ? e.touches[0].clientX : e.clientX; 
    };
    const onMove = (e: any) => {
      if (!dragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      targetRot += (x - lastX) * 0.004;
      lastX = x;
    };
    const onEnd = (e: any) => {
      if (dragging) {
        const x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        if (Math.abs(x - lastX) < 5) {
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(photoMeshes);
          if (intersects.length > 0) {
            setSelectedPhoto(intersects[0].object.userData.url);
          }
        }
      }
      dragging = false;
    };

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchstart', onDown);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);

    updateSize();

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      currentRot += (targetRot - currentRot) * 0.08;
      reelGroup.rotation.y = currentRot;
      
      // 电影感微动
      reelGroup.position.y = Math.sin(Date.now() * 0.001) * 0.1;

      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener('resize', updateSize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      // 彻底销毁渲染器资源
      renderer.dispose();
      scene.clear();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [photos]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-3xl animate-in fade-in duration-1000">
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        
        {/* 标题装饰 */}
        <div className="absolute top-12 text-center w-full z-10 pointer-events-none">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-cyan-500" />
            <h2 className="text-4xl font-black text-white tracking-[0.6em] italic drop-shadow-[0_0_15px_rgba(0,255,255,0.4)]">
              MEMORY REEL
            </h2>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-cyan-500" />
          </div>
          <p className="text-cyan-400/50 text-[10px] uppercase tracking-[0.8em] font-bold">滚动播放 • 记忆电影院</p>
        </div>

        {/* 胶卷渲染区 */}
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        
        {/* 控制按钮 */}
        <div className="absolute bottom-16 flex flex-col items-center gap-4 z-10">
          <button 
            onClick={onClose}
            className="px-14 py-3 bg-white/5 hover:bg-cyan-500 hover:text-black text-white font-bold rounded-full transition-all border border-white/20 backdrop-blur-xl active:scale-95 group"
          >
            <span className="flex items-center gap-2">
               返回圣诞树 <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </span>
          </button>
        </div>

        {/* 电影放映室 - 放大视图 */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 z-[60] bg-black/98 flex items-center justify-center p-6 cursor-zoom-out animate-in zoom-in-95 duration-500"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-[90vw] max-h-[85vh] group">
              {/* 装饰边框 */}
              <div className="absolute -inset-2 border border-cyan-500/20 rounded-xl" />
              <img 
                src={selectedPhoto} 
                className="relative z-10 w-full h-full object-contain rounded shadow-[0_0_100px_rgba(0,255,255,0.15)]" 
                alt="Memory"
              />
              <div className="absolute -bottom-10 left-0 right-0 text-center text-cyan-500/40 text-[10px] tracking-widest font-black italic">
                NOW SHOWING: 2025 CHRISTMAS MEMORY
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoWall;
