// scripts/network.js

async function loadNetwork(db, currentUser) {
  const userRef = db.collection("users").doc(currentUser.username);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    console.error("Data user tidak ditemukan.");
    return;
  }

  const userData = userDoc.data();
  const level1 = userData.downlines || [];

  // Clear list Level 1 (frontline)
  const level1List = document.querySelector('#networkSection ul.list-disc');
  if (level1List) level1List.innerHTML = '';

  // Tampilkan nama + email untuk Level 1
  for (const downUsername of level1) {
    try {
      const downDoc = await db.collection("users").doc(downUsername).get();
      const downData = downDoc.data();
      if (downData) {
        const li = document.createElement('li');
        li.textContent = `${downData.name} (${downData.email})`;
        level1List.appendChild(li);
      }
    } catch (err) {
      console.error(`Gagal ambil data downline ${downUsername}:`, err);
    }
  }

  // Hitung simulasi jumlah level 2 - 10
  const levelCounts = [];
  let currentLevel = level1;
  for (let i = 2; i <= 10; i++) {
    const nextLevel = [];
    for (const u of currentLevel) {
      const doc = await db.collection("users").doc(u).get();
      const d = doc.data();
      if (d && d.downlines) {
        nextLevel.push(...d.downlines);
      }
    }
    levelCounts.push(nextLevel.length);
    currentLevel = nextLevel;
  }

  // Tampilkan ke list level 2-10
  const levelInfoList = document.querySelector('#networkSection ul.text-sm');
  if (levelInfoList) levelInfoList.innerHTML = '';

  levelCounts.forEach((count, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `Level ${idx + 2}: <strong>${count}</strong> orang`;
    levelInfoList.appendChild(li);
  });
}
