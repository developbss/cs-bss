<?php
session_start();
require 'config.php';

// PASSWORD UPDATE SESUAI REQUEST-MU
$upload_password = "Lum4jang";

if (isset($_POST['action'])) {
    if ($_POST['action'] === 'login') {
        if ($_POST['upload_pass'] === $upload_password) {
            $_SESSION['upload_access'] = true;
            header('Location: index.php?login=success');
        } else {
            header('Location: index.php?login=error');
        }
        exit;
    }

    if ($_POST['action'] === 'upload' && isset($_SESSION['upload_access'])) {
        $file = $_FILES['file'];
        if ($file['error'] == 0 && in_array($file['type'], ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])) {
            $name = pathinfo($file['name'], PATHINFO_FILENAME) . '.xlsx';
            $target_file = "uploads/" . $name; // FIX: Hardcoded "uploads/" tanpa constant

            // REPLACE LOGIC: Hapus file lama jika ada
            if (file_exists($target_file)) {
                unlink($target_file);
            }

            if (move_uploaded_file($file['tmp_name'], $target_file)) {
                header('Location: index.php?upload=success');
            } else {
                header('Location: index.php?upload=error');
            }
        } else {
            header('Location: index.php?upload=error');
        }
        exit;
    }
}

if (isset($_GET['logout'])) {
    unset($_SESSION['upload_access']);
    session_destroy();
    $return = $_GET['return'] ?? 'index.php';
    header("Location: $return");
    exit;
}

if (isset($_GET['delete']) && isset($_SESSION['upload_access'])) {
    $file_to_delete = "uploads/" . basename($_GET['delete']); // FIX: Hardcoded "uploads/"
    if (file_exists($file_to_delete) && pathinfo($file_to_delete, PATHINFO_EXTENSION) === 'xlsx') {
        unlink($file_to_delete);
    }
    header('Location: index.php?delete=success');
    exit;
}
?>