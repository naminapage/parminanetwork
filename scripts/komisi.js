// scripts/komisi.js
async function prosesKomisiTransaksi(transaksiDoc) {
  const data = transaksiDoc.data();
  const usernamePembeli = data.userID;
  const jumlah = data.jumlah;

  const userDoc = await db.collection("users").doc(usernamePembeli).get();
  const userData = userDoc.data();

  if (!userData) return;

  const statusAktif = userData.statusAktif === true;
  const sponsorID = userData.sponsorID;
  const parentID = userData.parentID;

  // Komisi Sponsor (langsung)
  if (statusAktif && sponsorID && sponsorID !== "root") {
    await db.collection("komisi").add({
      userID: sponsorID,
      dariUser: usernamePembeli,
      jumlah: Math.floor(jumlah * 0.1), // 10%
      jenis: "Sponsor",
      tanggal: new Date()
    });
  }

  // Komisi Matrix (hingga 10 level)
  let uplineID = parentID;
  let level = 1;

  while (uplineID && uplineID !== "root" && level <= 10) {
    const uplineDoc = await db.collection("users").doc(uplineID).get();
    const uplineData = uplineDoc.data();

    if (!uplineData) break;

    // Tambahkan omzet jaringan ke upline (selalu masuk, aktif/tidak)
    const omzetLama = uplineData.omzetJaringan || 0;
    await db.collection("users").doc(uplineID).update({
      omzetJaringan: omzetLama + jumlah
    });

    // Komisi matrix hanya kalau pembeli aktif
    if (statusAktif) {
      await db.collection("komisi").add({
        userID: uplineID,
        dariUser: usernamePembeli,
        jumlah: Math.floor(jumlah * 0.05), // 5%
        jenis: "Matrix Lv" + level,
        tanggal: new Date()
      });
    }

    uplineID = uplineData.parentID;
    level++;
  }
}

async function loadKomisiUser() {
  const komisiSnapshot = await db.collection("komisi")
    .where("userID", "==", window.currentUser.username)
    .get();

  let total = 0;
  let sponsor = 0;
  let matrix = 0;

  komisiSnapshot.forEach(doc => {
    const data = doc.data();
    total += data.jumlah;
    if (data.jenis === "Sponsor") sponsor += data.jumlah;
    else matrix += data.jumlah;
  });

  document.querySelector(".total-komisi").textContent = `Rp${total.toLocaleString()}`;
  document.querySelector(".komisi-sponsor").textContent = `Rp${sponsor.toLocaleString()}`;
  document.querySelector(".komisi-matrix").textContent = `Rp${matrix.toLocaleString()}`;
}
