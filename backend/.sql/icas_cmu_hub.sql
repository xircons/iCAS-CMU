-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 19, 2025 at 09:20 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `icas_cmu_hub`
--

-- --------------------------------------------------------

--
-- Table structure for table `assignment_attachments`
--

CREATE TABLE `assignment_attachments` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_mime_type` varchar(100) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `assignment_attachments`
--

INSERT INTO `assignment_attachments` (`id`, `assignment_id`, `file_path`, `file_name`, `file_mime_type`, `file_size`, `created_at`, `updated_at`) VALUES
(11, 4, 'uploads/assignments/แผนการศึกษา-นศ.-DII_gen6_เทอม2-68-1763352872282-993329456.pdf', 'แผนการศึกษา-นศ.-DII_gen6_เทอม2-68.pdf', 'application/pdf', 396417, '2025-11-17 04:14:32', '2025-11-17 04:14:32'),
(12, 4, 'uploads/assignments/Untitled-1763353283760-748453480.png', 'Untitled.png', 'image/png', 556688, '2025-11-17 04:21:23', '2025-11-17 04:21:23');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_comments`
--

CREATE TABLE `assignment_comments` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment_text` text NOT NULL,
  `parent_comment_id` int(11) DEFAULT NULL,
  `is_hidden` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `assignment_comments`
--

INSERT INTO `assignment_comments` (`id`, `assignment_id`, `user_id`, `comment_text`, `parent_comment_id`, `is_hidden`, `created_at`, `updated_at`) VALUES
(1, 4, 5, 'jasdhnjashdas', NULL, 1, '2025-11-17 06:12:50', '2025-11-17 06:33:10'),
(2, 4, 2, 'hi kub', 1, 0, '2025-11-17 06:13:13', '2025-11-17 06:13:13'),
(3, 4, 2, 'asdsad', NULL, 1, '2025-11-17 06:38:47', '2025-11-17 06:39:07');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_submissions`
--

CREATE TABLE `assignment_submissions` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `submission_type` enum('text','file') NOT NULL,
  `text_content` text DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `file_mime_type` varchar(100) DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `graded_by` int(11) DEFAULT NULL,
  `graded_at` timestamp NULL DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `check_ins`
--

CREATE TABLE `check_ins` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `check_in_method` enum('qr','passcode') NOT NULL,
  `check_in_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `check_ins`
--

INSERT INTO `check_ins` (`id`, `event_id`, `user_id`, `check_in_method`, `check_in_time`, `created_at`) VALUES
(1, 4, 10, 'passcode', '2025-11-11 08:35:55', '2025-11-11 08:35:55'),
(2, 4, 5, 'qr', '2025-11-11 08:47:02', '2025-11-11 08:47:02'),
(3, 3, 10, 'qr', '2025-11-11 09:33:36', '2025-11-11 09:33:36'),
(4, 3, 5, 'passcode', '2025-11-11 09:34:03', '2025-11-11 09:34:03'),
(5, 3, 6, 'passcode', '2025-11-11 09:34:41', '2025-11-11 09:34:41'),
(6, 3, 8, 'passcode', '2025-11-11 09:35:30', '2025-11-11 09:35:30'),
(7, 8, 10, 'qr', '2025-11-11 17:25:50', '2025-11-11 17:25:50'),
(8, 7, 10, 'passcode', '2025-11-11 17:37:39', '2025-11-11 17:37:39'),
(9, 9, 10, 'qr', '2025-11-11 18:11:50', '2025-11-11 18:11:50');

-- --------------------------------------------------------

--
-- Table structure for table `check_in_sessions`
--

CREATE TABLE `check_in_sessions` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `passcode` varchar(6) NOT NULL,
  `qr_code_data` text NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `regenerate_on_checkin` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `check_in_sessions`
--

INSERT INTO `check_in_sessions` (`id`, `event_id`, `passcode`, `qr_code_data`, `expires_at`, `created_by`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 4, '849473', '{\"eventId\":4,\"sessionId\":\"13662529dff2b75a58f702352ef01347\",\"timestamp\":1762849898870,\"token\":\"f05124e29a16ec98\"}', '2025-11-11 08:34:42', 2, 0, '2025-11-11 08:31:38', '2025-11-11 08:34:42'),
(2, 4, '593993', '{\"eventId\":4,\"sessionId\":\"651341902c037d8048334de97518608c\",\"timestamp\":1762850149882,\"token\":\"fb75e4ffedd2519f\"}', '2025-11-11 08:40:05', 2, 0, '2025-11-11 08:35:49', '2025-11-11 08:40:05'),
(3, 4, '208009', '{\"eventId\":4,\"sessionId\":\"856eec53a0be0cf8d2d5310edbcd6c39\",\"timestamp\":1762850405385,\"token\":\"161b04cd33c9a11b\"}', '2025-11-11 08:59:58', 2, 0, '2025-11-11 08:40:05', '2025-11-11 08:59:58'),
(4, 4, '564144', '{\"eventId\":4,\"sessionId\":\"dc059845d94f68f00221856161db92b2\",\"timestamp\":1762851598230,\"token\":\"092ab894d1511219\"}', '2025-11-11 09:26:12', 2, 0, '2025-11-11 08:59:58', '2025-11-11 09:26:12'),
(5, 3, '392357', '{\"eventId\":3,\"sessionId\":\"120b4df4330380866e7054029109164b\",\"timestamp\":1762851623055,\"token\":\"485d0c9d35b474d2\"}', '2025-11-11 09:19:12', 2, 0, '2025-11-11 09:00:23', '2025-11-11 09:19:12'),
(6, 3, '111477', '{\"eventId\":3,\"sessionId\":\"2faeb801be8084dd20f8cc4ce5f055b0\",\"timestamp\":1762852752187,\"token\":\"ec396a8e9ffd2035\"}', '2025-11-11 09:34:30', 2, 0, '2025-11-11 09:19:12', '2025-11-11 09:34:30'),
(7, 4, '300238', '{\"eventId\":4,\"sessionId\":\"3fdee135c821b199087882db5fae43c2\",\"timestamp\":1762853172437,\"token\":\"a80756ae32a4c74e\"}', '2025-11-11 09:41:12', 2, 1, '2025-11-11 09:26:12', '2025-11-11 09:26:12'),
(8, 3, '142329', '{\"eventId\":3,\"sessionId\":\"60f2561d339ce061429cf4dc9156d09c\",\"timestamp\":1762853673575,\"token\":\"fb08d9b4b8291ea7\"}', '2025-11-11 09:51:13', 2, 0, '2025-11-11 09:34:33', '2025-11-11 09:51:13'),
(9, 3, '168456', '{\"eventId\":3,\"sessionId\":\"7d57d07b75c7c80c5ff4ec50a4071255\",\"timestamp\":1762854673208,\"token\":\"58fa39f0067da90f\"}', '2025-11-11 09:54:19', 2, 0, '2025-11-11 09:51:13', '2025-11-11 09:54:19'),
(10, 3, '732976', '{\"eventId\":3,\"sessionId\":\"bfb8322d9ba8e54db1a1fc2ab009dc1c\",\"timestamp\":1762854985605,\"token\":\"393e4e38359d49a7\"}', '2025-11-11 10:11:25', 2, 1, '2025-11-11 09:56:25', '2025-11-11 09:56:25'),
(11, 8, '735881', '{\"eventId\":8,\"sessionId\":\"b810568e5c96824e7cddf8d8089c3044\",\"timestamp\":1762881922828,\"token\":\"850b3bffc630777b\"}', '2025-11-12 02:18:41', 2, 0, '2025-11-11 17:25:22', '2025-11-12 02:18:41'),
(12, 7, '338889', '{\"eventId\":7,\"sessionId\":\"b25c0926ca3fce357d4a11484aac375f\",\"timestamp\":1762882035978,\"token\":\"a632eee9aae86cb5\"}', '2025-11-11 17:42:15', 2, 1, '2025-11-11 17:27:15', '2025-11-11 17:27:15'),
(13, 9, '457340', '{\"eventId\":9,\"sessionId\":\"0a9ba00c2927d26058277aecbca31d50\",\"timestamp\":1762884673461,\"token\":\"375a2f47d228d993\"}', '2025-11-11 18:12:02', 2, 0, '2025-11-11 18:11:13', '2025-11-11 18:12:02'),
(14, 9, '877537', '{\"eventId\":9,\"sessionId\":\"3dfe68efc190292508dcb0a476b1c252\",\"timestamp\":1762884729201,\"token\":\"6663eca05f6bd894\"}', '2025-11-11 18:27:09', 2, 1, '2025-11-11 18:12:09', '2025-11-11 18:12:09'),
(15, 8, '164279', '{\"eventId\":8,\"sessionId\":\"8590bb8a1c3809c2ee67b22de499c94d\",\"timestamp\":1762913921495,\"token\":\"8d21b91532fab30f\"}', '2025-11-12 02:33:41', 2, 1, '2025-11-12 02:18:41', '2025-11-12 02:18:41');

-- --------------------------------------------------------

--
-- Table structure for table `clubs`
--

CREATE TABLE `clubs` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  `president_id` int(11) DEFAULT NULL,
  `meeting_day` varchar(100) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `logo` varchar(500) DEFAULT NULL,
  `status` enum('active','pending','inactive') NOT NULL DEFAULT 'active',
  `description` text DEFAULT NULL,
  `home_content` text DEFAULT NULL,
  `home_title` varchar(255) DEFAULT 'Announcements',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `clubs`
--

INSERT INTO `clubs` (`id`, `name`, `category`, `president_id`, `meeting_day`, `location`, `logo`, `status`, `description`, `home_content`, `home_title`, `created_at`) VALUES
(1, 'ชมรมดนตรีสากล', NULL, 2, NULL, NULL, NULL, 'active', 'ชมรมสำหรับผู้ที่สนใจดนตรีสากลและการแสดง', NULL, 'Announcements', '2025-11-11 04:32:00'),
(2, 'ชมรมกีฬา', NULL, 3, NULL, NULL, NULL, 'active', 'ชมรมสำหรับผู้ที่รักการออกกำลังกายและกีฬา', NULL, 'Announcements', '2025-11-11 04:32:00'),
(3, 'ชมรมศิลปะ', NULL, 4, NULL, NULL, NULL, 'active', 'ชมรมสำหรับผู้ที่สนใจศิลปะและการวาดภาพ', NULL, 'Announcements', '2025-11-11 04:32:00'),
(4, 'ชมรมภาษา', NULL, NULL, NULL, NULL, NULL, 'active', 'ชมรมสำหรับผู้ที่สนใจการเรียนรู้ภาษา', NULL, 'Announcements', '2025-11-11 04:32:00'),
(5, 'ชมรมเทคโนโลยี', NULL, NULL, NULL, NULL, NULL, 'active', 'ชมรมสำหรับผู้ที่สนใจเทคโนโลยีและโปรแกรมมิ่ง', NULL, 'Announcements', '2025-11-11 04:32:00');

-- --------------------------------------------------------

--
-- Table structure for table `club_assignments`
--

CREATE TABLE `club_assignments` (
  `id` int(11) NOT NULL,
  `club_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `max_score` int(11) DEFAULT NULL,
  `available_date` datetime NOT NULL,
  `due_date` datetime NOT NULL,
  `is_visible` tinyint(1) DEFAULT 1,
  `attachment_path` varchar(500) DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `attachment_mime_type` varchar(100) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `club_assignments`
--

INSERT INTO `club_assignments` (`id`, `club_id`, `title`, `description`, `max_score`, `available_date`, `due_date`, `is_visible`, `attachment_path`, `attachment_name`, `attachment_mime_type`, `created_by`, `created_at`, `updated_at`) VALUES
(4, 1, 'test', NULL, NULL, '2025-11-17 04:15:00', '2025-11-17 04:25:00', 1, NULL, NULL, NULL, 2, '2025-11-17 04:14:32', '2025-11-17 04:21:53');

-- --------------------------------------------------------

--
-- Table structure for table `club_chat_messages`
--

DROP TABLE IF EXISTS `club_chat_messages`;
CREATE TABLE `club_chat_messages` (
  `id` int(11) NOT NULL,
  `club_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `encrypted_message` text NOT NULL,
  `status` enum('sending','sent','failed') NOT NULL DEFAULT 'sent',
  `is_edited` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  `is_unsent` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_by_sender` tinyint(1) NOT NULL DEFAULT 0,
  `reply_to_message_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `club_chat_messages`
--

INSERT INTO `club_chat_messages` (`id`, `club_id`, `user_id`, `encrypted_message`, `status`, `is_edited`, `created_at`, `updated_at`, `deleted_at`, `is_unsent`, `deleted_by_sender`, `reply_to_message_id`) VALUES
(1, 1, 2, 'Zvg+izvuYQwpY3gwTjJ+Axi/a4mN5ktXxkjSWPKtm35UxA==', 'sent', 0, '2025-11-19 06:10:06', '2025-11-19 07:32:29', '2025-11-19 07:32:29', 0, 0, NULL),
(2, 1, 2, 'kV4RqYTaiqN7pBZOrnuYmyzlOiRphgOMG8a/8h+0gyai5Q==', 'sent', 0, '2025-11-19 06:10:17', '2025-11-19 07:32:31', '2025-11-19 07:32:31', 0, 0, NULL),
(3, 1, 5, 'pUiPrp5yXvhLA3sAnEHWjiITBhE8CwtdzC6dtO5ahwtNa6xn', 'sent', 0, '2025-11-19 06:17:52', '2025-11-19 07:32:34', '2025-11-19 07:32:34', 0, 0, NULL),
(4, 1, 5, 'jSHcoYHi7iW8DKKyMTfwox8/JLrvUs32bxEPN8dXWia2', 'sent', 0, '2025-11-19 06:35:37', '2025-11-19 07:32:36', '2025-11-19 07:32:36', 0, 0, NULL),
(5, 1, 2, 'gwM11CEy0GsL4Ant3vQqrv8HGnc8j+j6iMFAU3MVo4P8vPR0', 'sent', 1, '2025-11-19 07:32:52', '2025-11-19 07:56:21', NULL, 0, 1, NULL),
(6, 1, 5, 'qtDvTj12vg3QEGNEkNeU288LvvoQuwzIXR+IDuqbjXwprJGoUhM=', 'sent', 0, '2025-11-19 07:33:29', '2025-11-19 07:56:10', NULL, 1, 1, NULL),
(7, 1, 2, 'EpLo3Y0jYG8IYLAo0Sqg4O0krHlo9uzOmMtiqV2Dd6/AvNIb', 'sent', 0, '2025-11-19 07:51:10', '2025-11-19 07:56:29', '2025-11-19 07:56:29', 0, 0, NULL),
(8, 1, 2, 'gsl04Ui61WPadNzCA3Nsq8FNDEoFH0klDT3hfLxpbSj3p1OAahI=', 'sent', 0, '2025-11-19 07:51:16', '2025-11-19 07:51:23', '2025-11-19 07:51:23', 1, 0, NULL),
(9, 1, 5, 'eT5nu4KdokkRMpeGmF/S9dAcR9+tuq3tlPnahXdbTJ1BjseOBvLFCWzw3vVcYw==', 'sent', 0, '2025-11-19 07:58:35', '2025-11-19 07:58:35', NULL, 0, 0, NULL),
(10, 1, 2, '7pkkdLR9lnRFjA9PQYZcFx6NXzFPXQM1TxpSKjiJHSa31g==', 'sent', 0, '2025-11-19 08:13:03', '2025-11-19 08:13:03', NULL, 0, 0, NULL),
(11, 1, 2, 'u33h/psY3C6iBO+iz7UDAjDnkXl7LzYewXyXK4mGtWmiNMOYqA==', 'sent', 0, '2025-11-19 08:13:10', '2025-11-19 08:13:10', NULL, 0, 0, 10),
(12, 1, 2, 'sBz6V0HgWnTrBjHR6JJwsISlwby8XZzLrw3O5askvtEYBTiQ', 'sent', 0, '2025-11-19 08:13:16', '2025-11-19 08:13:16', NULL, 0, 0, 9),
(13, 1, 2, 'A//b+QeUGAlJ98hs4OUEqvgXJhI6PGLEIMngptyVVVbX', 'sent', 0, '2025-11-19 08:13:23', '2025-11-19 08:13:23', NULL, 0, 0, NULL),
(14, 1, 5, 'zJjj7N3l1iFjdDCybbdtAUBKTs85F9cEIuye/Pv9o6OxGIbH1g==', 'sent', 0, '2025-11-19 08:17:51', '2025-11-19 08:17:51', NULL, 0, 0, NULL),
(15, 1, 2, 'y0mmVaGh1TrKAYxt+tmNVCnD0pEYEDEAeewNANh1eVoVaDmdD/Q=', 'sent', 0, '2025-11-19 08:18:03', '2025-11-19 08:18:18', NULL, 1, 1, NULL),
(16, 1, 2, 'Dtyq6YdyHyXXeurtQtGQ09YsWYiB9iwVZd0wWFmX6jEHI+Y=', 'sent', 0, '2025-11-19 08:18:20', '2025-11-19 08:18:23', '2025-11-19 08:18:23', 0, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `club_memberships`
--

CREATE TABLE `club_memberships` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `club_id` int(11) NOT NULL,
  `status` enum('pending','approved','rejected','left') NOT NULL DEFAULT 'pending',
  `role` enum('member','staff','leader') NOT NULL DEFAULT 'member',
  `request_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `approved_date` timestamp NULL DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `club_memberships`
--

INSERT INTO `club_memberships` (`id`, `user_id`, `club_id`, `status`, `role`, `request_date`, `approved_date`, `approved_by`, `created_at`, `updated_at`) VALUES
(1, 10, 2, 'pending', 'member', '2025-11-11 11:48:37', NULL, NULL, '2025-11-11 11:48:37', '2025-11-11 11:48:37'),
(2, 10, 1, 'approved', 'member', '2025-11-11 18:22:25', '2025-11-11 18:22:28', 2, '2025-11-11 11:48:58', '2025-11-11 18:22:28'),
(3, 2, 1, 'approved', 'leader', '2025-11-11 12:00:34', '2025-11-11 12:00:34', 1, '2025-11-11 12:00:34', '2025-11-11 12:00:34'),
(4, 3, 2, 'approved', 'leader', '2025-11-11 12:00:34', '2025-11-11 12:00:34', 1, '2025-11-11 12:00:34', '2025-11-11 12:00:34'),
(5, 4, 3, 'approved', 'leader', '2025-11-11 12:00:34', '2025-11-11 12:00:34', 1, '2025-11-11 12:00:34', '2025-11-11 12:00:34'),
(8, 6, 1, 'approved', 'member', '2025-11-11 12:55:21', '2025-11-11 12:55:24', 2, '2025-11-11 12:54:48', '2025-11-11 12:55:24'),
(9, 5, 1, 'approved', 'member', '2025-11-14 03:19:18', '2025-11-14 03:19:21', 2, '2025-11-14 03:19:18', '2025-11-14 03:19:21');

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('Report','Form','Application','Contract','Letter','Other') NOT NULL,
  `recipient` varchar(255) NOT NULL,
  `due_date` date NOT NULL,
  `status` enum('Draft','Sent','Delivered','Read','Needs Revision') DEFAULT 'Draft',
  `sent_by` int(11) DEFAULT NULL,
  `sent_date` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `documents`
--

INSERT INTO `documents` (`id`, `title`, `type`, `recipient`, `due_date`, `status`, `sent_by`, `sent_date`, `notes`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'รายงานประจำเดือน', 'Report', 'คณะกรรมการชมรม', '2024-02-15', 'Sent', 2, '2025-11-11 04:32:00', 'รายงานกิจกรรมประจำเดือนมกราคม', 2, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(2, 'ใบสมัครเข้าร่วมกิจกรรม', 'Application', 'สมาชิกชมรม', '2024-02-20', 'Draft', NULL, NULL, 'กิจกรรมคอนเสิร์ต', 1, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(3, 'สัญญาจ้างงาน', 'Contract', 'บริษัทภายนอก', '2024-02-25', 'Draft', NULL, NULL, 'สัญญาจ้างงานสำหรับงานอีเวนต์', 2, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(4, 'จดหมายแจ้งเตือน', 'Letter', 'สมาชิกชมรม', '2024-02-18', 'Sent', 2, '2025-11-11 04:32:00', 'แจ้งเตือนการประชุม', 2, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(5, 'แบบฟอร์มเบิกจ่าย', 'Form', 'ฝ่ายการเงิน', '2024-02-22', 'Needs Revision', 2, '2025-11-11 04:32:00', 'เบิกจ่ายค่าอุปกรณ์', 2, '2025-11-11 04:32:00', '2025-11-11 04:32:00');

-- --------------------------------------------------------

--
-- Table structure for table `document_assignments`
--

CREATE TABLE `document_assignments` (
  `id` int(11) NOT NULL,
  `document_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('Open','In Progress','Completed') NOT NULL DEFAULT 'Open',
  `submission_status` enum('Not Submitted','Submitted','Approved','Needs Revision') NOT NULL DEFAULT 'Not Submitted',
  `file_path` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `file_mime_type` varchar(100) DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `admin_comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `document_assignments`
--

INSERT INTO `document_assignments` (`id`, `document_id`, `user_id`, `status`, `submission_status`, `file_path`, `file_name`, `file_size`, `file_mime_type`, `submitted_at`, `admin_comment`, `created_at`, `updated_at`) VALUES
(5, 2, 5, 'Open', 'Approved', 'uploads/smart-documents/เอกสารขอใช้ห้อง-1763483737918-229864991.pdf', 'เอกสารขอใช้ห้อง.pdf', 84580, 'application/pdf', '2025-11-18 16:35:37', NULL, '2025-11-18 14:15:50', '2025-11-18 18:15:23'),
(6, 2, 10, 'Open', 'Not Submitted', NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-18 14:15:50', '2025-11-18 14:15:50'),
(7, 2, 6, 'Open', 'Not Submitted', NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-18 14:15:50', '2025-11-18 14:15:50'),
(8, 2, 2, 'Open', 'Submitted', 'uploads/smart-documents/ข้อตกลงการยืม-Notebook-68_(1)-1763477527925-950900453.pdf', 'ข้อตกลงการยืม-Notebook-68 (1).pdf', 66559, 'application/pdf', '2025-11-18 14:52:07', NULL, '2025-11-18 14:15:50', '2025-11-18 14:52:07');

-- --------------------------------------------------------

--
-- Table structure for table `document_templates`
--

CREATE TABLE `document_templates` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(50) DEFAULT 'Other',
  `file_path` varchar(500) NOT NULL,
  `club_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `is_public` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('practice','meeting','performance','workshop','other') NOT NULL,
  `date` date NOT NULL,
  `time` varchar(50) NOT NULL,
  `location` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `attendees` int(11) DEFAULT 0,
  `reminder_enabled` tinyint(1) DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `title`, `type`, `date`, `time`, `location`, `description`, `attendees`, `reminder_enabled`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'คอนเสิร์ตประจำปี', 'performance', '2024-03-15', '18:00', 'หอประชุมใหญ่', 'คอนเสิร์ตประจำปีของชมรมดนตรีสากล', 0, 1, 2, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(2, 'การประชุมประจำเดือน', 'meeting', '2024-02-20', '14:00', 'ห้องประชุม 101', 'การประชุมประจำเดือนเพื่อวางแผนกิจกรรม', 0, 1, 2, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(3, 'การซ้อมดนตรี', 'practice', '2024-02-18', '16:00', 'ห้องซ้อมดนตรี', 'การซ้อมดนตรีสำหรับสมาชิกใหม่', 0, 0, 2, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(4, 'เวิร์คช็อปศิลปะ', 'workshop', '2024-02-25', '10:00', 'ห้องศิลปะ', 'เวิร์คช็อปการวาดภาพสำหรับผู้เริ่มต้น', 0, 1, 3, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(5, 'การแข่งขันกีฬา', 'other', '2024-03-01', '08:00', 'สนามกีฬา', 'การแข่งขันกีฬาภายในชมรม', 0, 1, 3, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(6, 'ไปเล่นบาสกัน', 'other', '2025-11-13', '00:00', 'สนามบาส 1', 'ไม่มาโกรธ', 0, 1, 2, '2025-11-11 16:31:14', '2025-11-11 16:31:14'),
(7, 'ตีกลอง', 'practice', '2025-11-12', '14:00 - 17:00', 'ห้องดนตรี 22', NULL, 0, 1, 2, '2025-11-11 16:37:12', '2025-11-11 16:37:12'),
(8, 'ไปเล่นบาสกัน', 'meeting', '2025-11-12', '00:00', 'สนามบาส 1', NULL, 0, 1, 2, '2025-11-11 17:08:38', '2025-11-11 17:08:38'),
(9, 'kkk', 'meeting', '2025-12-25', '01:57', 'kk', NULL, 0, 1, 2, '2025-11-11 17:57:05', '2025-11-11 17:57:05');

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `type` enum('feedback','issue','suggestion','complaint','question','appreciation') NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `sender_id` int(11) NOT NULL,
  `status` enum('new','in-review','resolved') DEFAULT 'new',
  `assigned_to` varchar(255) DEFAULT NULL,
  `response` text DEFAULT NULL,
  `response_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`id`, `type`, `subject`, `message`, `sender_id`, `status`, `assigned_to`, `response`, `response_date`, `created_at`, `updated_at`) VALUES
(1, 'feedback', 'ข้อเสนอแนะเกี่ยวกับกิจกรรม', 'ขอเสนอแนะให้เพิ่มกิจกรรมในช่วงเย็นเพื่อให้สมาชิกที่เรียนช่วงเช้าสามารถเข้าร่วมได้', 5, 'new', NULL, NULL, NULL, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(2, 'issue', 'ปัญหาอุปกรณ์', 'ไมโครโฟนในห้องซ้อมมีปัญหาเสียงไม่ชัด', 6, 'in-review', 'leader@cmu.ac.th', NULL, NULL, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(3, 'suggestion', 'ข้อเสนอแนะการจัดการ', 'ควรมีการแจ้งเตือนล่วงหน้าก่อนกิจกรรม 3 วัน', 7, 'resolved', 'leader2@cmu.ac.th', 'ขอบคุณสำหรับข้อเสนอแนะ เราจะปรับปรุงระบบแจ้งเตือนให้ดีขึ้น', '2025-11-11 04:32:00', '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(4, 'appreciation', 'ขอบคุณสำหรับกิจกรรม', 'ขอบคุณสำหรับกิจกรรมที่จัดขึ้นเมื่อสัปดาห์ที่แล้ว สนุกมากครับ', 8, 'new', NULL, NULL, NULL, '2025-11-11 04:32:00', '2025-11-11 04:32:00'),
(5, 'question', 'สอบถามเกี่ยวกับการสมัคร', 'ต้องการทราบขั้นตอนการสมัครเข้าร่วมชมรม', 9, 'in-review', 'leader3@cmu.ac.th', NULL, NULL, '2025-11-11 04:32:00', '2025-11-11 04:32:00');

-- --------------------------------------------------------

--
-- Table structure for table `smart_documents`
--

CREATE TABLE `smart_documents` (
  `id` int(11) NOT NULL,
  `club_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `priority` enum('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  `type` enum('Report','Checklist','Request Form','Contract','Letter','Other') NOT NULL DEFAULT 'Report',
  `template_path` varchar(500) DEFAULT NULL,
  `due_date` date NOT NULL,
  `status` enum('Open','In Progress','Completed') NOT NULL DEFAULT 'Open',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `smart_documents`
--

INSERT INTO `smart_documents` (`id`, `club_id`, `title`, `description`, `priority`, `type`, `template_path`, `due_date`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(2, 1, 'ส่งเอกสารยืม laptop', 'test', 'High', 'Contract', 'documents/general_request.pdf', '2025-11-20', 'In Progress', 1, '2025-11-18 14:15:50', '2025-11-18 18:15:23');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `major` varchar(255) NOT NULL,
  `role` enum('member','leader','admin') NOT NULL DEFAULT 'member',
  `club_id` int(11) DEFAULT NULL,
  `club_name` varchar(255) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`, `phone_number`, `major`, `role`, `club_id`, `club_name`, `avatar`, `created_at`, `updated_at`) VALUES
(1, 'admin@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'ประภาส', 'ผู้ดูแลระบบ', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'admin', NULL, NULL, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', '2025-11-11 04:32:00', '2025-11-11 06:03:05'),
(2, 'leader@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมหญิง', 'หัวหน้าชมรมดนตรีสากล', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 1, 'ชมรมดนตรีสากล', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader', '2025-11-11 04:32:00', '2025-11-11 06:03:05'),
(3, 'leader2@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมศักดิ์', 'หัวหน้าชมรมกีฬา', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 2, 'ชมรมกีฬา', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader2', '2025-11-11 04:32:00', '2025-11-11 06:03:05'),
(4, 'leader3@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมหมาย', 'หัวหน้าชมรมศิลปะ', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 3, 'ชมรมศิลปะ', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader3', '2025-11-11 04:32:00', '2025-11-11 06:03:05'),
(5, 'member@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมชาย', 'นักศึกษา', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 1, 'ชมรมดนตรีสากล', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Member', '2025-11-11 04:32:00', '2025-11-11 06:03:05'),
(6, 'member2@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมหญิง', 'นักศึกษา', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 1, 'ชมรมดนตรีสากล', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Member2', '2025-11-11 04:32:00', '2025-11-11 06:03:05'),
(7, 'member3@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมศักดิ์', 'นักศึกษา', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 2, 'ชมรมกีฬา', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Member3', '2025-11-11 04:32:00', '2025-11-11 06:03:05'),
(8, 'member4@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมหมาย', 'นักศึกษา', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 2, 'ชมรมกีฬา', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Member4', '2025-11-11 04:32:00', '2025-11-11 06:03:05'),
(9, 'member5@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมปอง', 'นักศึกษา', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 3, 'ชมรมศิลปะ', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Member5', '2025-11-11 04:32:00', '2025-11-11 06:03:05'),
(10, 'wutthikan_s@cmu.ac.th', '$2a$10$W2LhGQKckAIQ2CR5qACUnutO9Lnh9aACeTOz2H3BqWwd5KIppbPvy', 'วุฒิการ', 'สุขแสน', '093-319-9416', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', NULL, NULL, NULL, '2025-11-11 06:19:41', '2025-11-11 12:25:18'),
(11, 'xirconsss@cmu.ac.th', '$2a$10$o3WTQpSg4Iio3BLayLs.kexgPhAUDivXdOW7pIFyjwo.s6E/vgNHq', 'ววว ห', 'สุขแสน', NULL, 'คณะเภสัชศาสตร์', 'member', NULL, NULL, NULL, '2025-11-11 06:23:24', '2025-11-11 06:23:24'),
(12, 'Wuttikan_S@cmu.ac.th', '$2a$10$dDA5qsYgneevZ5SFo1SmsuU3hMBEwFR7hLjef00M77/xYKnqog5cq', 'ววว', 'สสส', NULL, 'คณะเทคนิคการแพทย์', 'member', NULL, NULL, NULL, '2025-11-11 07:06:07', '2025-11-11 07:06:07');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `assignment_attachments`
--
ALTER TABLE `assignment_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assignment_id` (`assignment_id`);

--
-- Indexes for table `assignment_comments`
--
ALTER TABLE `assignment_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_assignment_id` (`assignment_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_parent_comment_id` (`parent_comment_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_assignment_user` (`assignment_id`,`user_id`),
  ADD KEY `idx_assignment_id` (`assignment_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_graded_by` (`graded_by`),
  ADD KEY `idx_submitted_at` (`submitted_at`);

--
-- Indexes for table `check_ins`
--
ALTER TABLE `check_ins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_event_user` (`event_id`,`user_id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_check_in_time` (`check_in_time`);

--
-- Indexes for table `check_in_sessions`
--
ALTER TABLE `check_in_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `clubs`
--
ALTER TABLE `clubs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_president_id` (`president_id`);

--
-- Indexes for table `club_assignments`
--
ALTER TABLE `club_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_club_id` (`club_id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_available_date` (`available_date`),
  ADD KEY `idx_due_date` (`due_date`);

--
-- Indexes for table `club_chat_messages`
--
ALTER TABLE `club_chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_club_id` (`club_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_deleted_at` (`deleted_at`),
  ADD KEY `idx_reply_to_message_id` (`reply_to_message_id`);

--
-- Indexes for table `club_memberships`
--
ALTER TABLE `club_memberships`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_club` (`user_id`,`club_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_club_id` (`club_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_approved_by` (`approved_by`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_due_date` (`due_date`),
  ADD KEY `sent_by` (`sent_by`);

--
-- Indexes for table `document_assignments`
--
ALTER TABLE `document_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_document_user` (`document_id`,`user_id`),
  ADD KEY `idx_document_id` (`document_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_submission_status` (`submission_status`);

--
-- Indexes for table `document_templates`
--
ALTER TABLE `document_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_club_id` (`club_id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_is_public` (`is_public`),
  ADD KEY `idx_created_by` (`created_by`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_type` (`type`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sender_id` (`sender_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_type` (`type`);

--
-- Indexes for table `smart_documents`
--
ALTER TABLE `smart_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_club_id` (`club_id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_due_date` (`due_date`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_major` (`major`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `assignment_attachments`
--
ALTER TABLE `assignment_attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `assignment_comments`
--
ALTER TABLE `assignment_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `check_ins`
--
ALTER TABLE `check_ins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `check_in_sessions`
--
ALTER TABLE `check_in_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Add regenerate_on_checkin column to check_in_sessions (if not exists in existing database)
--
-- Note: This ALTER TABLE statement is for migrating existing databases.
-- If the column already exists, this statement will fail but can be safely ignored.
-- The column is already included in the CREATE TABLE statement above.
ALTER TABLE `check_in_sessions`
  ADD COLUMN `regenerate_on_checkin` tinyint(1) NOT NULL DEFAULT 1 AFTER `is_active`;

--
-- AUTO_INCREMENT for table `clubs`
--
ALTER TABLE `clubs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `club_assignments`
--
ALTER TABLE `club_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `club_chat_messages`
--
ALTER TABLE `club_chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `club_memberships`
--
ALTER TABLE `club_memberships`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `document_assignments`
--
ALTER TABLE `document_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `document_templates`
--
ALTER TABLE `document_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `smart_documents`
--
ALTER TABLE `smart_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assignment_attachments`
--
ALTER TABLE `assignment_attachments`
  ADD CONSTRAINT `assignment_attachments_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `club_assignments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignment_comments`
--
ALTER TABLE `assignment_comments`
  ADD CONSTRAINT `assignment_comments_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `club_assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignment_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignment_comments_ibfk_3` FOREIGN KEY (`parent_comment_id`) REFERENCES `assignment_comments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD CONSTRAINT `assignment_submissions_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `club_assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignment_submissions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignment_submissions_ibfk_3` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `check_ins`
--
ALTER TABLE `check_ins`
  ADD CONSTRAINT `check_ins_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `check_ins_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `check_in_sessions`
--
ALTER TABLE `check_in_sessions`
  ADD CONSTRAINT `check_in_sessions_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `check_in_sessions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `clubs`
--
ALTER TABLE `clubs`
  ADD CONSTRAINT `clubs_ibfk_1` FOREIGN KEY (`president_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `club_assignments`
--
ALTER TABLE `club_assignments`
  ADD CONSTRAINT `club_assignments_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `club_assignments_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `club_chat_messages`
--
ALTER TABLE `club_chat_messages`
  ADD CONSTRAINT `club_chat_messages_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `club_chat_messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `club_chat_messages_ibfk_3` FOREIGN KEY (`reply_to_message_id`) REFERENCES `club_chat_messages` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `club_memberships`
--
ALTER TABLE `club_memberships`
  ADD CONSTRAINT `club_memberships_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `club_memberships_ibfk_2` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `club_memberships_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `document_assignments`
--
ALTER TABLE `document_assignments`
  ADD CONSTRAINT `document_assignments_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `smart_documents` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `document_assignments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `document_templates`
--
ALTER TABLE `document_templates`
  ADD CONSTRAINT `document_templates_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `document_templates_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `smart_documents`
--
ALTER TABLE `smart_documents`
  ADD CONSTRAINT `smart_documents_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `smart_documents_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
