import React, { useEffect, Suspense, useRef, useState, useMemo } from 'react';
import './App.css';
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls, useFBX } from '@react-three/drei'
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { useZxing } from "react-zxing";
import ResultPoint from '@zxing/library/esm/core/ResultPoint';

const FBXModel = (props:{setActionName: React.Dispatch<React.SetStateAction<string>>, detectcount: number}) => {
  /* FBXモデル読込み */
  const fbx = useLoader(FBXLoader, "assets/Ch09_nonPBR.fbx");
  /* AnimationClip(s)読込み */
  const animCrips: THREE.AnimationClip[][] = []
  animCrips[0] = useFBX('./assets/BreakdanceEnding2.fbx').animations
  animCrips[1] = useFBX('./assets/BreakdanceUprockVar1.fbx').animations
  animCrips[2] = useFBX('./assets/HipHopDancing.fbx').animations
  animCrips[3] = useFBX('./assets/NorthernSoulSpin.fbx').animations
  animCrips[4] = useFBX('./assets/SwingDancing.fbx').animations
  animCrips[5] = useFBX('./assets/BreakdanceEnding1.fbx').animations
  const animNames = ['BreakdanceEnding2', 'BreakdanceUprockVar1', 'HipHopDancing', 'NorthernSoulSpin', 'SwingDancing', 'BreakdanceEnding1']
  /* 変数定義 */
  const mixer = useRef<THREE.AnimationMixer>();
  const [ animIdx, setAnimIdx ] = useState<number>(-1);
  const animActions = useMemo(() => [] as THREE.AnimationAction[], [])

  /* 初期化 */
  useEffect(() => {
    fbx.scale.multiplyScalar(0.02)
    mixer.current = new THREE.AnimationMixer(fbx)
    animCrips.forEach((val: THREE.AnimationClip[], idx: number) => {
      if(!mixer.current) return;
      animActions[idx] = mixer.current.clipAction(val[0])
    })
  }, [])

  useEffect(() => {
    if(props.detectcount > 0 && animIdx == -1) {
      setAnimIdx(0);
      animActions[0].play();
    }
  }, [props.detectcount])

    /* モーション切替え処理 */
  useEffect(() => {
    const act: THREE.AnimationAction = animActions[animIdx]
    act?.reset().fadeIn(0.3).play()
    props.setActionName(animNames[animIdx] + ' : ' + animIdx)
    return () => {
      act?.fadeOut(0.3)
    }
  }, [animIdx])

  /* FPS処理 */
  useFrame((state, delta) => {
    if(animIdx == -1) return;

    if(mixer.current)
      mixer.current.update(delta);
    const durationtime: number= animActions[animIdx].getClip().duration
    const currenttime: number = animActions[animIdx].time
    if(currenttime/durationtime > 0.9/*90%を超えたら次のモーションへ*/) {
      if(animIdx+1 == animCrips.length)
        setAnimIdx(-1)
      else
        setAnimIdx( (animIdx+1) % (animCrips.length) )
    }
  });

  return (
    <primitive object={fbx} position={[1, -1, 1]} />
  )
}

const ZxingQRCodeReader = (props:{setSize: React.Dispatch<React.SetStateAction<strSize>>, setCenter: React.Dispatch<React.SetStateAction<strPoint>>, setDetecte: React.Dispatch<React.SetStateAction<number>>}) => {
  const detectcount = useRef<number>(0);
  const { ref } = useZxing({
    constraints: {
      audio: false,
      video: {
        facingMode: 'environment',
        width: { min: 1024, ideal: 1920, max: 1920 },
        height: { min: 576, ideal: 1080, max: 1080 },
      },
    },
    timeBetweenDecodingAttempts: 100,
    onDecodeResult(result) {
      console.log('onDecodeResult::result=', result);
      if(result.getResultPoints().length <= 0) return;

//        setResult(result.getText());

      const points: ResultPoint[] = result.getResultPoints()

      /* 中心を求める */
      const center: ResultPoint = (points.length==4) ? CenterofLine(points[2], points[0]) :
                                  (points.length==3) ? CrossLineLine( points[0], points[1], points[2], points[3]) :
                                  new ResultPoint(0,0);
      props.setCenter({x: center.getX(), y: center.getY()});
      props.setDetecte(detectcount.current++);
      console.log('aaa detected!! count=', detectcount);

      console.log(points.length, " -----[0]: ", points[0]?.getX(), " ,", points[0]?.getY(),)
      console.log(points.length, " -----[1]: ", points[1]?.getX(), " ,", points[1]?.getY(),)
      console.log(points.length, " -----[2]: ", points[2]?.getX(), " ,", points[2]?.getY(),)
      console.log(points.length, " -----[3]: ", points[3]?.getX(), " ,", points[3]?.getY(),)
    },
  });

  /* Videoサイズ変更に合わせてCanvasサイズを変更する */
  useEffect(() => {
    if(!ref.current) return;
    props.setSize({width: ref.current.videoWidth, height: ref.current.videoHeight});
  }, [ref.current?.videoWidth, ref.current?.videoHeight]);

  console.log("ref.current?.videoxxx=(", ref.current?.videoWidth, ",", ref.current?.videoHeight, ")" );

  return (
    <video ref={ref} />
  );
};

/**********************/
/* 線分の中心点を求める */
/**********************/
const CenterofLine = (p00: ResultPoint, p01: ResultPoint) => {
    const xpwr = Math.abs(p00.getX() - p01.getX());
    const xm   = Math.min(p00.getX() , p01.getX()) + xpwr/2;
    const ypwr = Math.abs(p00.getY() - p01.getY());
    const ym   = Math.min(p00.getY() , p01.getY()) + ypwr/2;
    return new ResultPoint( xm, ym);
}

/**********************/
/* 2線分の交点を求める */
/* p1 ------ p2 */
/* |          | */
/* |          | */
/* |          | */
/* p0 ------ p3 */
/**********************/
const CrossLineLine = (p00: ResultPoint, p01: ResultPoint, p02: ResultPoint, p03: ResultPoint) => {
  const s1: number = ((p02.getX()-p00.getX())*(p01.getY()-p00.getY())-(p02.getY()-p00.getY())*(p01.getX()-p00.getX())) / 2.0;
  const s2: number = ((p02.getX()-p00.getX())*(p00.getY()-p03.getY())-(p02.getY()-p00.getY())*(p00.getX()-p03.getX())) / 2.0;
  const x: number = p01.getX()+(p03.getX()-p01.getX()) * s1 / (s1+s2);
  const y: number = p01.getY()+(p03.getY()-p01.getY()) * s1 / (s1+s2);
  return new ResultPoint( x, y);
}

type strSize = { width: number; height: number; };
type strPoint= { x:     number; y:      number; };

const App = () => {
  const [actionName, setActionName] = useState<string>('aaabbb');
  const [size, setSize] = useState<strSize>({width: 300, height: 200});
  const [center, setCenter] = useState<strPoint>({x: 0, y: 0});
  const [detectcount, setDetecte] = useState<number>(0);

  return (
    <div>
      <ZxingQRCodeReader setSize={setSize} setCenter={setCenter} setDetecte={setDetecte}/>
      <Canvas camera={{ position: [3, 1, 3] }} style={{ position: "absolute", left: `${center.x-(size.width/2)}px`,  top: `${center.y-(size.height/2)}px`, width: `${size.width}px`,  height: `${size.height}px`,}}>
        <ambientLight intensity={2} />
        <pointLight position={[40, 40, 40]} />
        <Suspense fallback={null}>
          <FBXModel setActionName={setActionName} detectcount={detectcount}/>
        </Suspense>
        <OrbitControls />
        <axesHelper args={[5]} />
        <gridHelper />
      </Canvas>
      <div id="summry" style={{background: "rgba(255, 192, 192, 0.7)"}}>{actionName}</div>
    </div>
  );
}

export default App;
