async function catatPembelian(qty) {
  const user = window.currentUser;
  if (!user || !user.username) {
    alert("User tidak valid.");
    return;
  }

  const hargaProduk = 100000;
  const nominal = hargaProduk * qty;
  const now = new Date();

  try {
    const tahun = now.getFullYear();
    const bulan = now.getMonth();
    const awalCutOff = new Date(bulan === 0 ? tahun - 1 : tahun, bulan === 0 ? 11 : bulan - 1, 26);
    const akhirCutOff = new Date(tahun, bulan, 25);

    // Cek apakah ini pembelian pertama dalam periode cut-off
    const transaksiSnapshot = await db.collection("transaksi")
      .where("userID", "==", user.username)
      .where("tanggal", ">=", awalCutOff)
      .where("tanggal", "<=", akhirCutOff)
      .get();

    const isPembelianPertama = transaksiSnapshot.empty;

    // 1. Simpan transaksi
    await db.collection("transaksi").add({
      userID: user.username,
      jumlah: nominal,
      kuantitas: qty,
      tanggal: now
    });

    // 2. Update pembelian pribadi & status aktif (kalau pertama)
    const updateData = {
      pembelianPribadi: firebase.firestore.FieldValue.increment(nominal)
    };
    if (isPembelianPertama) updateData.statusAktif = true;

    await db.collection("users").doc(user.username).update(updateData);

    // 3. Ambil data user lengkap
    const userDoc = await db.collection("users").doc(user.username).get();
    const dataUser = userDoc.data();

    // 4. Komisi sponsor (hanya pembelian pertama)
    if (isPembelianPertama && dataUser.sponsorID && dataUser.sponsorID !== 'root') {
      const sponsorRef = db.collection("users").doc(dataUser.sponsorID);

      await db.collection("komisi").add({
        userID: dataUser.sponsorID,
        sumber: user.username,
        jenis: "Sponsor",
        nominal: Math.floor(nominal * 0.1), // 10%
        tanggal: now
      });

      await sponsorRef.update({
        omzetJaringan: firebase.firestore.FieldValue.increment(nominal)
      });
    }

    // 5. Komisi matrix + omzet jaringan
    let currentID = dataUser.parentID;
    for (let level = 1; level <= 10 && currentID && currentID !== 'root'; level++) {
      const uplineRef = db.collection("users").doc(currentID);
      const uplineDoc = await uplineRef.get();

      if (uplineDoc.exists) {
        const dataUpline = uplineDoc.data();

        // Komisi matrix (hanya jika pembelian pertama dan upline aktif)
        if (isPembelianPertama && dataUpline.statusAktif) {
          await db.collection("komisi").add({
            userID: currentID,
            sumber: user.username,
            jenis: `Matrix Lv${level}`,
            nominal: Math.floor(nominal * 0.05), // 5%
            tanggal: now
          });
        }

        // Omzet jaringan SELALU masuk
        await uplineRef.update({
          omzetJaringan: firebase.firestore.FieldValue.increment(nominal)
        });

        currentID = dataUpline.parentID;
      } else {
        break;
      }
    }

    // 6. Komisi loyalty (jika bukan pembelian pertama)
    if (!isPembelianPertama) {
      await db.collection("komisi").add({
        userID: user.username,
        sumber: user.username,
        jenis: "Loyalty",
        nominal: Math.floor(nominal * 0.05), // 5% loyalty
        tanggal: now
      });
    }

    alert(`Transaksi ${qty} produk berhasil dicatat!`);
  } catch (err) {
    console.error("Gagal catat pembelian:", err);
    alert("Gagal mencatat pembelian.");
  }
}
