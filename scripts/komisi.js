async function prosesKomisiTransaksi(transaksiDoc) {
  const data = transaksiDoc.data();
  const usernamePembeli = data.userID;
  const jumlah = data.jumlah;
  const tanggalTransaksi = data.tanggal.toDate();

  const userDoc = await db.collection("users").doc(usernamePembeli).get();
  const userData = userDoc.data();
  if (!userData) return;

  const sponsorID = userData.sponsorID;
  const parentID = userData.parentID;

  // Hitung cut-off 26 bulan lalu - 25 bulan ini
  const tahun = tanggalTransaksi.getFullYear();
  const bulan = tanggalTransaksi.getMonth();
  const awalCutOff = new Date(bulan === 0 ? tahun - 1 : tahun, bulan - 1, 26);
  const akhirCutOff = new Date(tahun, bulan, 25);
  const cairTanggal = new Date(akhirCutOff.getFullYear(), akhirCutOff.getMonth() + 1, 10);

  const transaksiSnapshot = await db.collection("transaksi")
    .where("userID", "==", usernamePembeli)
    .where("tanggal", ">=", awalCutOff)
    .where("tanggal", "<=", akhirCutOff)
    .get();

  const isPembelianPertama = transaksiSnapshot.size === 1; // karena transaksi ini sudah masuk

  if (isPembelianPertama) {
    // === Komisi Sponsor ===
    if (sponsorID && sponsorID !== "root") {
      await db.collection("komisi").add({
        userID: sponsorID,
        dariUser: usernamePembeli,
        jumlah: Math.floor(jumlah * 0.1),
        jenis: "Sponsor",
        tanggal: tanggalTransaksi,
        cairTanggal,
        status: "pending"
      });
    }

    // === Komisi Matrix ===
    let uplineID = parentID;
    let level = 1;
    while (uplineID && uplineID !== "root" && level <= 10) {
      const uplineDoc = await db.collection("users").doc(uplineID).get();
      const uplineData = uplineDoc.data();
      if (!uplineData) break;

      // Tambah omzet
      const omzetLama = uplineData.omzetJaringan || 0;
      await db.collection("users").doc(uplineID).update({
        omzetJaringan: omzetLama + jumlah
      });

      await db.collection("komisi").add({
        userID: uplineID,
        dariUser: usernamePembeli,
        jumlah: Math.floor(jumlah * 0.05),
        jenis: "Matrix Lv" + level,
        tanggal: tanggalTransaksi,
        cairTanggal,
        status: "pending"
      });

      uplineID = uplineData.parentID;
      level++;
    }

    // === Update status aktif user ===
    await db.collection("users").doc(usernamePembeli).update({
      statusAktif: true
    });

  } else {
    // === Komisi Loyalty ===
    await db.collection("komisi").add({
      userID: usernamePembeli,
      dariUser: usernamePembeli,
      jumlah: 5000,
      jenis: "Loyalty",
      tanggal: tanggalTransaksi,
      cairTanggal,
      status: "pending"
    });
  }
}
