import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, Text, View, Dimensions, TouchableOpacity, StatusBar, Image, Modal, PanResponder, Platform 
} from 'react-native';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHIP_SIZE = 60;
const P_BULLET_SIZE = 12;
const B_BULLET_SIZE = 20;
const CHICKEN_SIZE = 50;
const BOSS_SIZE = 140;
const POWERUP_SIZE = 45;

const MUSIC_URL = 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3';
const SHOOT_URL = 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/bonus.mp3';

const getShipSprite = (id) => `https://robohash.org/${id}.png?set=set3&size=${SHIP_SIZE}x${SHIP_SIZE}`;
const getChickenSprite = (seed) => `https://robohash.org/chicken_${seed}.png?set=set2&size=${CHICKEN_SIZE}x${CHICKEN_SIZE}`;
const getBossSprite = (lvl) => `https://robohash.org/BOSS_INTRUDER_MK${lvl}.png?set=set1&size=${BOSS_SIZE}x${BOSS_SIZE}`;
const getPowerupSprite = () => `https://robohash.org/WEAPON_CRATE.png?set=set4&size=${POWERUP_SIZE}x${POWERUP_SIZE}`;

const SKINS = [
  { id: 'AlphaOne', name: 'Alpha' },
  { id: 'ValkyrieX', name: 'Valkyrie' },
  { id: 'InterceptorZ', name: 'Interceptor' },
  { id: 'OmegaPrime', name: 'Destroyer' },
];

export default function ChickenIntruderGame() {
  const [gameState, setGameState] = useState('MENU');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [playerHp, setPlayerHp] = useState(100);
  const [bossHp, setBossHp] = useState(100);
  const [maxBossHp, setMaxBossHp] = useState(100);
  const [selectedSkin, setSelectedSkin] = useState('AlphaOne');
  
  const [bgMusic, setBgMusic] = useState(null);
  const [sfxShoot, setSfxShoot] = useState(null);

  const stars = useMemo(() => {
    return [...Array(60)].map((_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.8 + 0.2
    }));
  }, []);

  const shipPos = useRef({ x: SCREEN_WIDTH/2 - SHIP_SIZE/2, y: SCREEN_HEIGHT - 150 });
  const pBullets = useRef([]);
  const bBullets = useRef([]);
  const chickens = useRef([]);
  const powerUps = useRef([]);
  const boss = useRef(null);
  
  const weaponLevel = useRef(1);
  const killCount = useRef(0);
  const spawnTimer = useRef(0);
  const bossAttackTimer = useRef(0);
  const frameId = useRef(0);

  const [renderPBullets, setRenderPBullets] = useState([]);
  const [renderBBullets, setRenderBBullets] = useState([]);
  const [renderChickens, setRenderChickens] = useState([]);
  const [renderPowerUps, setRenderPowerUps] = useState([]);
  const [renderBoss, setRenderBoss] = useState(null);

  // --- 🕹️ CONTROLS ENGINE ---
  const updateShipPosition = (x, y) => {
    if (gameState === 'PLAYING' || gameState === 'BOSS_FIGHT') {
      shipPos.current = { 
        x: x - SHIP_SIZE / 2, 
        y: y - SHIP_SIZE 
      };
    }
  };

  // Mobile Touch Logic
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => updateShipPosition(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderMove: (evt) => updateShipPosition(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
    })
  ).current;

  // PC Mouse Logic (Just moving mouse updates ship)
  const handleMouseMove = (e) => {
    // Only run this on Web
    if (Platform.OS === 'web') {
      updateShipPosition(e.nativeEvent.pageX, e.nativeEvent.pageY);
    }
  };

  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const { sound: music } = await Audio.Sound.createAsync(
          { uri: MUSIC_URL }, { isLooping: true, volume: 0.5 }
        );
        setBgMusic(music);
        const { sound: laser } = await Audio.Sound.createAsync(
          { uri: SHOOT_URL }, { volume: 0.3 } 
        );
        setSfxShoot(laser);
      } catch (error) { console.log("Audio Error:", error); }
    }
    setupAudio();
    return () => {
      if (bgMusic) bgMusic.unloadAsync();
      if (sfxShoot) sfxShoot.unloadAsync();
    };
  }, []);

  const playShootSound = async () => {
    try { if (sfxShoot) await sfxShoot.replayAsync(); } catch (e) {}
  };

  useEffect(() => {
    const loop = () => {
      if (gameState === 'PLAYING' || gameState === 'BOSS_FIGHT') {
        updateGameLogic();
      }
      frameId.current = requestAnimationFrame(loop);
    };
    frameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId.current);
  }, [gameState, level]);

  const updateGameLogic = () => {
    spawnTimer.current++;

    if (gameState === 'PLAYING') {
      if (killCount.current >= level * 10) spawnBoss();
      if (spawnTimer.current > Math.max(15, 60 - level * 2)) {
        chickens.current.push({
          id: Math.random(),
          spriteId: Math.floor(Math.random() * 9999),
          x: Math.random() * (SCREEN_WIDTH - CHICKEN_SIZE),
          y: -CHICKEN_SIZE
        });
        spawnTimer.current = 0;
      }
    }

    const fireRate = Math.max(5, 20 - (weaponLevel.current * 3));
    if (spawnTimer.current % fireRate === 0) spawnPlayerBullets();

    if (gameState === 'BOSS_FIGHT' && boss.current) {
      bossAttackTimer.current++;
      boss.current.x += boss.current.vx;
      if (boss.current.x <= 0 || boss.current.x >= SCREEN_WIDTH - BOSS_SIZE) boss.current.vx *= -1;
      
      if (bossAttackTimer.current % Math.max(30, 80 - level) === 0) {
        bBullets.current.push({
          id: Math.random(),
          x: boss.current.x + BOSS_SIZE/2 - B_BULLET_SIZE/2,
          y: boss.current.y + BOSS_SIZE - 20
        });
      }
    }

    pBullets.current = pBullets.current.map(b => ({ ...b, y: b.y - 15 })).filter(b => b.y > -20);
    bBullets.current = bBullets.current.map(b => ({ ...b, y: b.y + 8 })).filter(b => b.y < SCREEN_HEIGHT);
    chickens.current = chickens.current.map(c => ({ ...c, y: c.y + (2 + level*0.2), x: c.x + Math.sin(c.y / 30) * 4 })).filter(c => c.y < SCREEN_HEIGHT);
    powerUps.current = powerUps.current.map(p => ({ ...p, y: p.y + 5 })).filter(p => p.y < SCREEN_HEIGHT);

    checkCollisions();

    setRenderPBullets([...pBullets.current]);
    setRenderBBullets([...bBullets.current]);
    setRenderChickens([...chickens.current]);
    setRenderPowerUps([...powerUps.current]);
    setRenderBoss(boss.current ? {...boss.current} : null);
  };

  const spawnPlayerBullets = () => {
    playShootSound();
    const x = shipPos.current.x + SHIP_SIZE/2 - P_BULLET_SIZE/2;
    const y = shipPos.current.y;
    pBullets.current.push({ id: Math.random(), x, y }); 
    if (weaponLevel.current >= 2) {
      pBullets.current.push({ id: Math.random(), x: x - 20, y: y + 10 });
      pBullets.current.push({ id: Math.random(), x: x + 20, y: y + 10 });
    }
    if (weaponLevel.current >= 3) {
      pBullets.current.push({ id: Math.random(), x: x - 45, y: y + 25 });
      pBullets.current.push({ id: Math.random(), x: x + 45, y: y + 25 });
    }
  };

  const spawnBoss = () => {
    const newMax = 100 + (level * 300);
    setGameState('BOSS_FIGHT');
    setMaxBossHp(newMax);
    setBossHp(newMax);
    boss.current = {
      x: SCREEN_WIDTH/2 - BOSS_SIZE/2,
      y: 80,
      vx: 3 + (level * 0.5),
      spriteUrl: getBossSprite(level)
    };
  };

  const checkCollisions = () => {
    pBullets.current.forEach((b, bIdx) => {
      chickens.current.forEach((c, cIdx) => {
        if (checkRect(b, P_BULLET_SIZE, c, CHICKEN_SIZE)) {
          pBullets.current.splice(bIdx, 1);
          chickens.current.splice(cIdx, 1);
          handleKill(c.x, c.y);
        }
      });
      if (gameState === 'BOSS_FIGHT' && boss.current) {
        if (checkRect(b, P_BULLET_SIZE, boss.current, BOSS_SIZE)) {
          pBullets.current.splice(bIdx, 1);
          setBossHp(prev => {
            const next = prev - 10;
            if (next <= 0) handleBossKill();
            return next;
          });
        }
      }
    });
    bBullets.current.forEach((b, bIdx) => {
      if (checkRect(b, B_BULLET_SIZE, shipPos.current, SHIP_SIZE)) {
        bBullets.current.splice(bIdx, 1);
        takeDamage(15);
      }
    });
    chickens.current.forEach((c, cIdx) => {
      if (checkRect(c, CHICKEN_SIZE, shipPos.current, SHIP_SIZE)) {
        chickens.current.splice(cIdx, 1);
        takeDamage(20);
      }
    });
    powerUps.current.forEach((p, pIdx) => {
      if (checkRect(p, POWERUP_SIZE, shipPos.current, SHIP_SIZE)) {
        powerUps.current.splice(pIdx, 1);
        weaponLevel.current = Math.min(weaponLevel.current + 1, 5);
        setScore(prev => prev + 500);
      }
    });
  };

  const checkRect = (o1, s1, o2, s2) => {
    const p = 5; 
    return (o1.x+p < o2.x+s2-p && o1.x+s1-p > o2.x+p && o1.y+p < o2.y+s2-p && o1.y+s1-p > o2.y+p);
  };

  const handleKill = (x, y) => {
    setScore(prev => prev + 100);
    killCount.current += 1;
    if (Math.random() < 0.10) powerUps.current.push({ id: Math.random(), x, y });
  };

  const handleBossKill = () => {
    setGameState('PLAYING');
    boss.current = null;
    bBullets.current = [];
    killCount.current = 0;
    setLevel(prev => prev + 1);
    setScore(prev => prev + 5000);
    setPlayerHp(prev => Math.min(100, prev + 50));
  };

  const takeDamage = (amt) => {
    setPlayerHp(prev => {
      const next = prev - amt;
      if (next <= 0) setGameState('GAME_OVER');
      return next;
    });
  };

  const startGame = async () => {
    if (bgMusic) {
      try { await bgMusic.playAsync(); } catch (e) {}
    }
    setGameState('PLAYING'); setScore(0); setLevel(1); setPlayerHp(100); 
    weaponLevel.current = 1; killCount.current = 0; boss.current = null;
    pBullets.current = []; bBullets.current = []; chickens.current = []; powerUps.current = [];
    shipPos.current = { x: SCREEN_WIDTH/2 - SHIP_SIZE/2, y: SCREEN_HEIGHT - 150 };
  };

  // --- RENDER FUNCTIONS ---
  const renderMainMenu = () => (
    <View style={styles.overlay}>
      <Text style={styles.title}>CHICKEN</Text>
      <Text style={styles.subtitle}>INTRUDER</Text>
      <Image source={{ uri: getShipSprite(selectedSkin) }} style={styles.menuShip} />
      <TouchableOpacity onPress={startGame} style={styles.btnPrimary}>
        <Text style={styles.btnText}>START MISSION</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setGameState('SKINS')} style={styles.btnSecondary}>
        <Text style={styles.btnText}>SELECT SHIP</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSkinsMenu = () => (
    <View style={styles.overlay}>
      <Text style={styles.subtitle}>SELECT SHIP</Text>
      <View style={styles.grid}>
        {SKINS.map(s => (
          <TouchableOpacity key={s.id} onPress={() => setSelectedSkin(s.id)} 
            style={[styles.card, selectedSkin === s.id && styles.cardActive]}>
            <Image source={{ uri: getShipSprite(s.id) }} style={styles.cardImg} />
            <Text style={styles.cardText}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={() => setGameState('MENU')} style={styles.btnPrimary}>
        <Text style={styles.btnText}>CONFIRM</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPauseModal = () => (
    <Modal visible={gameState === 'PAUSED'} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>PAUSED</Text>
          <TouchableOpacity onPress={() => setGameState('PLAYING')} style={styles.btnPrimary}>
            <Text style={styles.btnText}>RESUME</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setGameState('MENU')} style={[styles.btnSecondary, {marginTop:10}]}>
            <Text style={styles.btnText}>QUIT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View 
      style={styles.container} 
      {...panResponder.panHandlers} 
      onMouseMove={handleMouseMove} 
    >
      <StatusBar hidden />
      
      {stars.map(s => (
        <View key={s.id} style={{
          position: 'absolute', left: s.x, top: s.y,
          width: s.size, height: s.size,
          backgroundColor: 'white', opacity: s.opacity, borderRadius: s.size/2
        }} />
      ))}

      {gameState === 'MENU' && renderMainMenu()}
      {gameState === 'SKINS' && renderSkinsMenu()}
      {gameState === 'GAME_OVER' && (
        <View style={styles.overlay}>
          <Text style={[styles.title, {color: '#bf616a'}]}>DEFEATED</Text>
          <Text style={styles.subtitle}>Score: {score}</Text>
          <TouchableOpacity onPress={startGame} style={styles.btnPrimary}><Text style={styles.btnText}>RETRY</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setGameState('MENU')} style={styles.btnSecondary}><Text style={styles.btnText}>MENU</Text></TouchableOpacity>
        </View>
      )}
      {renderPauseModal()}

      {(gameState === 'PLAYING' || gameState === 'BOSS_FIGHT' || gameState === 'PAUSED') && (
        <>
          <View style={styles.hud}>
            <View>
              <Text style={styles.hudLabel}>LVL {level}</Text>
              <Text style={styles.hudScore}>{score}</Text>
            </View>
            <TouchableOpacity onPress={() => setGameState('PAUSED')} style={styles.pauseBtn}>
              <Text style={styles.pauseText}>||</Text>
            </TouchableOpacity>
            <View style={{alignItems:'flex-end'}}>
              <Text style={styles.hudLabel}>SHIELD</Text>
              <View style={styles.hpBg}><View style={[styles.hpFill, {width: `${Math.max(0, playerHp)}%`}]} /></View>
            </View>
          </View>

          {gameState === 'BOSS_FIGHT' && (
            <View style={styles.bossHud}>
              <Text style={styles.bossName}>INTRUDER MK.{level}</Text>
              <View style={styles.bossHpBg}><View style={[styles.bossHpFill, {width: `${(Math.max(0, bossHp)/maxBossHp)*100}%`}]} /></View>
            </View>
          )}

          {renderPBullets.map(b => <View key={b.id} style={[styles.pBull, {left:b.x, top:b.y}]} />)}
          {renderBBullets.map(b => <View key={b.id} style={[styles.bBull, {left:b.x, top:b.y}]} />)}
          {renderChickens.map(c => <Image key={c.id} source={{uri: getChickenSprite(c.spriteId)}} style={[styles.ent, {left:c.x, top:c.y, width:CHICKEN_SIZE, height:CHICKEN_SIZE}]} />)}
          {renderPowerUps.map(p => <Image key={p.id} source={{uri: getPowerupSprite()}} style={[styles.ent, {left:p.x, top:p.y, width:POWERUP_SIZE, height:POWERUP_SIZE}]} />)}
          {renderBoss && <Image source={{uri: renderBoss.spriteUrl}} style={[styles.ent, {left:renderBoss.x, top:renderBoss.y, width:BOSS_SIZE, height:BOSS_SIZE}]} />}
          
          <Image source={{ uri: getShipSprite(selectedSkin) }} style={[styles.ent, {left:shipPos.current.x, top:shipPos.current.y, width:SHIP_SIZE, height:SHIP_SIZE}]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // THE FIX: touchAction: 'none' prevents browser scrolling on Drag
  container: { flex: 1, backgroundColor: '#000015', overflow: 'hidden', touchAction: 'none' }, 
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  
  title: { fontSize: 50, fontWeight: 'bold', color: '#eceff4', letterSpacing: 2 },
  subtitle: { fontSize: 30, fontWeight: 'bold', color: '#bf616a', marginBottom: 30 },
  
  btnPrimary: { backgroundColor: '#5e81ac', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 8, marginBottom: 15 },
  btnSecondary: { backgroundColor: '#4c566a', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 8, marginBottom: 15 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  hud: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, marginTop: Constants.statusBarHeight },
  hudLabel: { color: '#88c0d0', fontSize: 12, fontWeight: 'bold' },
  hudScore: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  hpBg: { width: 100, height: 10, backgroundColor: '#333', borderWidth: 1, borderColor: '#555', borderRadius: 2 },
  hpFill: { height: '100%', backgroundColor: '#a3be8c' },
  pauseBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 5 },
  pauseText: { color: 'white', fontWeight: 'bold' },

  bossHud: { position: 'absolute', top: 90, width: '100%', alignItems: 'center' },
  bossName: { color: '#bf616a', fontWeight: 'bold', marginBottom: 5 },
  bossHpBg: { width: '60%', height: 15, backgroundColor: '#333', borderWidth: 2, borderColor: '#bf616a', borderRadius: 4 },
  bossHpFill: { height: '100%', backgroundColor: '#bf616a' },

  ent: { position: 'absolute', resizeMode: 'contain' },
  pBull: { position: 'absolute', width: P_BULLET_SIZE, height: 20, backgroundColor: '#88c0d0', borderRadius: 2 },
  bBull: { position: 'absolute', width: B_BULLET_SIZE, height: B_BULLET_SIZE, backgroundColor: '#bf616a', borderRadius: B_BULLET_SIZE/2, borderWidth: 1, borderColor: '#fff' },
  
  menuShip: { width: 120, height: 120, marginBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300, marginBottom: 20 },
  card: { margin: 10, padding: 10, backgroundColor: '#2e3440', borderRadius: 8, borderWidth: 2, borderColor: '#4c566a', alignItems: 'center' },
  cardActive: { borderColor: '#a3be8c', backgroundColor: '#3b4252' },
  cardImg: { width: 50, height: 50, marginBottom: 5 },
  cardText: { color: '#fff', fontSize: 10 },
  
  modalBox: { width: 250, padding: 20, backgroundColor: '#2e3440', borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: '#4c566a' },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});