// scripts/network.js

async function loadNetwork(db, currentUser) {
  const userDoc = await db.collection("users").doc(currentUser.username).get();
  const userData = userDoc.data();
  const level1 = userData.downlines || [];

  const level1List = document.querySelector('#networkSection ul.list-disc');
  level1List.innerHTML = '';

  for (const username of level1) {
    const downUserDoc = await db.collection("users").doc(username).get();
    const downData = downUserDoc.data();
    const li = document.createElement('li');
    li.textContent = `${downData.name} (${downData.email})`;
    level1List.appendChild(li);
  }

  // Level 2–10 bisa ditambahkan pakai perhitungan rekursif atau struktur tree kalau mau lebih kompleks
}
