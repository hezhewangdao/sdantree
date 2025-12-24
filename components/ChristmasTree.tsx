
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { UserPhoto } from '../types';

interface ChristmasTreeProps {
  photos: UserPhoto[];
  onDoubleClick: () => void;
  shattered: boolean;
}

const ChristmasTree: React.FC<ChristmasTreeProps> = ({ photos, onDoubleClick, shattered }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const photoGroupRef = useRef<THREE.Group>(null);
  const stateRef = useRef({ morphFactor: 0 }); 
  const decorationGroupRef = useRef<THREE.Group>(null);
  const mouse = useRef(new THREE.Vector2(-10, -10));
  const raycaster = useRef(new THREE.Raycaster());
  
  // 使用 ref 同步 shattered 状态，避免 Effect 频繁销毁重建
  const shatteredRef = useRef(shattered);
  useEffect(() => {
    shatteredRef.current = shattered;
  }, [shattered]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    camera.position.z = 8.5;
    camera.position.y = 2.2;

    // --- 圣诞树粒子系统 ---
    const particleCount = 38000;
    const basePositions = new Float32Array(particleCount * 3);
    const currentPositions = new Float32Array(particleCount * 3);
    const scatterDirs = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const cyan = new THREE.Color(0x00ffff);
    const blue = new THREE.Color(0x0066ff);
    const white = new THREE.Color(0xffffff);

    for (let i = 0; i < particleCount; i++) {
      let x = 0, y = 0, z = 0;
      let color = cyan;

      if (i < 18000) {
        const t = Math.random();
        const h = t * 5.5 - 1.5;
        const spiralTurns = 6;
        const angle = (t * Math.PI * 2 * spiralTurns);
        const baseRadius = (4.0 - h) * 0.45;
        const spread = 0.25 * (1 - t * 0.5);
        const r = baseRadius + (Math.random() - 0.5) * spread;
        x = Math.cos(angle) * r;
        y = h;
        z = Math.sin(angle) * r;
        color = Math.random() > 0.7 ? white : cyan;
      } else if (i < 33000) {
        const t = Math.random();
        const h = t * 5.2 - 1.5;
        const baseRadius = (4.0 - h) * 0.38;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * baseRadius;
        x = Math.cos(angle) * r;
        y = h;
        z = Math.sin(angle) * r;
        color = blue.clone().lerp(cyan, Math.random() * 0.5);
      } else {
        x = (Math.random() - 0.5) * 12;
        y = (Math.random() - 0.5) * 10 + 1;
        z = (Math.random() - 0.5) * 12;
        color = white;
      }

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      const dir = new THREE.Vector3(x, y, z).normalize();
      const mag = 10 + Math.random() * 15;
      scatterDirs[i * 3] = dir.x * mag;
      scatterDirs[i * 3 + 1] = dir.y * mag;
      scatterDirs[i * 3 + 2] = dir.z * mag;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const treeGeometry = new THREE.BufferGeometry();
    treeGeometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    treeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const treeMaterial = new THREE.PointsMaterial({ 
      size: 0.035, 
      vertexColors: true, 
      transparent: true, 
      opacity: 0.85, 
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const treePoints = new THREE.Points(treeGeometry, treeMaterial);
    scene.add(treePoints);

    // --- 地面 ---
    const floorCount = 6000;
    const floorPos = new Float32Array(floorCount * 3);
    const floorCols = new Float32Array(floorCount * 3);
    for (let i = 0; i < floorCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * 20;
      floorPos[i * 3] = Math.cos(angle) * dist;
      floorPos[i * 3 + 1] = -1.8;
      floorPos[i * 3 + 2] = Math.sin(angle) * dist;
      const c = dist < 6 ? cyan : blue;
      floorCols[i * 3] = c.r;
      floorCols[i * 3 + 1] = c.g;
      floorCols[i * 3 + 2] = c.b;
    }
    const floorGeo = new THREE.BufferGeometry();
    floorGeo.setAttribute('position', new THREE.BufferAttribute(floorPos, 3));
    floorGeo.setAttribute('color', new THREE.BufferAttribute(floorCols, 3));
    const floorMat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
    const floorPoints = new THREE.Points(floorGeo, floorMat);
    scene.add(floorPoints);

    const decorations = new THREE.Group();
    scene.add(decorations);
    (decorationGroupRef as any).current = decorations;

    const orbList: THREE.Mesh[] = [];
    const orbColors = [0xff0055, 0x00ff88, 0xffcc00, 0xaa00ff, 0xffffff];
    for (let i = 0; i < 70; i++) {
      const t = Math.random();
      const h = t * 5 - 1.2;
      const r = (4.0 - h) * 0.45;
      const angle = Math.random() * Math.PI * 2;
      const color = orbColors[i % orbColors.length];
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 })
      );
      orb.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
      decorations.add(orb);
      orbList.push(orb);
    }

    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    star.position.y = 4.0;
    scene.add(star);
    const starLight = new THREE.PointLight(0x00ffff, 4, 15);
    starLight.position.set(0, 4.0, 0);
    scene.add(starLight);

    // --- 背景雪花 ---
    const snowCount = 4000;
    const snowPositions = new Float32Array(snowCount * 3);
    const snowVelocities = new Float32Array(snowCount);
    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 40;
      snowPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      snowVelocities[i] = 0.02 + Math.random() * 0.06;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snowMat = new THREE.PointsMaterial({ size: 0.06, color: 0xffffff, transparent: true, opacity: 0.5 });
    const snowPoints = new THREE.Points(snowGeo, snowMat);
    scene.add(snowPoints);

    const photoGroup = new THREE.Group();
    scene.add(photoGroup);
    (photoGroupRef as any).current = photoGroup;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pl = new THREE.PointLight(0xffffff, 1.5, 20);
    pl.position.set(5, 5, 5);
    scene.add(pl);

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // 使用 ref 实时获取破碎状态
      const targetM = shatteredRef.current ? 1 : 0;
      stateRef.current.morphFactor += (targetM - stateRef.current.morphFactor) * 0.06;
      const m = stateRef.current.morphFactor;

      const posArr = treeGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        posArr[idx] = basePositions[idx] + scatterDirs[idx] * m;
        posArr[idx+1] = basePositions[idx+1] + scatterDirs[idx+1] * m;
        posArr[idx+2] = basePositions[idx+2] + scatterDirs[idx+2] * m;
      }
      treeGeometry.attributes.position.needsUpdate = true;
      treeMaterial.opacity = 0.85 * (1 - m * 0.9);
      floorMat.opacity = 0.3 * (1 - m);

      const snowArr = snowGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < snowCount; i++) {
        snowArr[i * 3 + 1] -= snowVelocities[i];
        if (snowArr[i * 3 + 1] < -15) snowArr[i * 3 + 1] = 15;
      }
      snowGeo.attributes.position.needsUpdate = true;

      if (!shatteredRef.current) {
        raycaster.current.setFromCamera(mouse.current, camera);
        const intersects = raycaster.current.intersectObjects(orbList);
        orbList.forEach(o => o.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1));
        if (intersects.length > 0) {
          (intersects[0].object as THREE.Mesh).scale.lerp(new THREE.Vector3(2.5, 2.5, 2.5), 0.2);
        }
      }

      decorations.visible = m < 0.99;
      decorations.position.y = -m * 20;
      photoGroup.visible = m < 0.9;
      star.visible = m < 0.8;
      starLight.intensity = 4 * (1 - m);

      treePoints.rotation.y += 0.005;
      decorations.rotation.y += 0.005;
      photoGroup.rotation.y += 0.005;
      star.rotation.y += 0.02;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      treeGeometry.dispose();
      treeMaterial.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []); // 仅挂载一次

  // 独立 Effect 更新照片
  useEffect(() => {
    if (!photoGroupRef.current) return;
    const group = photoGroupRef.current;
    while(group.children.length > 0) {
      const child = group.children[0] as any;
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      group.remove(child);
    }
    const loader = new THREE.TextureLoader();
    photos.forEach((p, i) => {
      const tex = loader.load(p.url);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.4),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true })
      );
      const h = Math.random() * 4 - 0.5;
      const r = (4.0 - h) * 0.45;
      const a = (i / photos.length) * Math.PI * 2 + Math.random();
      mesh.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
      mesh.lookAt(0, h, 0);
      group.add(mesh);
    });
  }, [photos]);

  return <div ref={containerRef} className="absolute inset-0 z-0" onDoubleClick={onDoubleClick} />;
};

export default ChristmasTree;
