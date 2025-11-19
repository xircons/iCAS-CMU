-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 11, 2025 at 07:14 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Disable foreign key checks to allow dropping tables in any order
SET FOREIGN_KEY_CHECKS = 0;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `icas_cmu_hub`
--

-- --------------------------------------------------------

--
-- Table structure for table `clubs`
--

DROP TABLE IF EXISTS `clubs`;
CREATE TABLE `clubs` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `president_id` int(11) DEFAULT NULL,
  `meeting_day` varchar(50) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `logo` varchar(500) DEFAULT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `home_content` text DEFAULT NULL,
  `home_title` varchar(255) DEFAULT 'Announcements',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `clubs`
--

INSERT INTO `clubs` (`id`, `name`, `description`, `category`, `president_id`, `meeting_day`, `location`, `logo`, `status`, `home_title`, `created_at`) VALUES
(1, 'ชมรมดนตรีสากล', 'ชมรมสำหรับผู้ที่สนใจดนตรีสากล ทั้งการเล่นเครื่องดนตรี ร้องเพลง และการแสดงบนเวที', 'Arts & Music', 2, 'Friday', 'ห้องซ้อมดนตรี', NULL, 'active', 'Announcements', '2025-01-15 00:00:00'),
(2, 'ชมรมกีฬาแบดมินตัน', 'ชมรมสำหรับผู้ที่รักการออกกำลังกายและกีฬาแบดมินตัน', 'Sports', 3, 'Saturday', 'สนามกีฬา', NULL, 'active', 'Announcements', '2025-01-20 00:00:00'),
(3, 'ชมรมภาพถ่าย', 'เรียนรู้และพัฒนาทักษะการถ่ายภาพ ทั้งภาพนิ่งและภาพเคลื่อนไหว', 'Arts & Media', 4, 'Sunday', 'ห้องศิลปะ', NULL, 'active', 'Announcements', '2025-02-20 00:00:00'),
(4, 'ชมรมหุ่นยนต์', 'พัฒนาและแข่งขันหุ่นยนต์ รวมถึงการเรียนรู้ AI และ IoT', 'Technology', 5, 'Wednesday', 'ห้องแล็บหุ่นยนต์', NULL, 'active', 'Announcements', '2025-01-10 00:00:00'),
(5, 'ชมรมอาสาพัฒนา', 'ทำกิจกรรมเพื่อสังคมและชุมชน', 'Community Service', 6, 'Sunday', 'ห้องประชุม', NULL, 'active', 'Announcements', '2025-01-25 00:00:00'),
(6, 'ชมรมภาษาญี่ปุ่น', 'เรียนรู้ภาษาและวัฒนธรรมญี่ปุ่น', 'Language & Culture', 7, 'Thursday', 'ห้องเรียนภาษา', NULL, 'active', 'Announcements', '2025-02-10 00:00:00'),
(7, 'ชมรมการ์ตูนและอนิเมะ', 'แลกเปลี่ยนความคิดเห็นเกี่ยวกับการ์ตูนและอนิเมะ', 'Arts & Media', 8, 'Saturday', 'ห้องกิจกรรม', NULL, 'active', 'Announcements', '2025-02-15 00:00:00'),
(8, 'ชมรมธุรกิจและการลงทุน', 'เรียนรู้การทำธุรกิจและการลงทุน', 'Business', 9, 'Tuesday', 'ห้องประชุม', NULL, 'active', 'Announcements', '2025-02-25 00:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
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
(1, 'Monthly Activity Report', 'Report', 'Student Affairs Office', '2025-11-15', 'Draft', NULL, NULL, 'Need to include event photos and attendance records.', 2, '2025-11-01 00:00:00', '2025-11-01 00:00:00'),
(2, 'Request Form', 'Form', 'Finance Department', '2025-11-10', 'Sent', 2, '2025-11-05 09:30:00', 'Requesting approval for upcoming event expenses.', 2, '2025-11-05 09:00:00', '2025-11-05 09:30:00'),
(3, 'Event Permission Application', 'Application', 'Campus Security', '2025-11-12', 'Delivered', 2, '2025-11-03 14:15:00', 'Application submitted. Waiting for approval.', 2, '2025-11-03 14:00:00', '2025-11-03 14:15:00'),
(4, 'Equipment Rental Contract', 'Contract', 'AV Equipment Supplier', '2025-11-08', 'Read', 2, '2025-10-30 11:45:00', 'Contract reviewed and signed by both parties.', 2, '2025-10-30 11:00:00', '2025-10-30 11:45:00'),
(5, 'Member Registration Letter', 'Letter', 'New Member Committee', '2025-11-18', 'Needs Revision', 2, '2025-11-01 10:00:00', 'Missing required signatures. Please resubmit.', 2, '2025-11-01 09:00:00', '2025-11-01 10:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` int(11) NOT NULL,
  `club_id` int(11) NOT NULL,
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

INSERT INTO `events` (`id`, `club_id`, `title`, `type`, `date`, `time`, `location`, `description`, `attendees`, `reminder_enabled`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'คอนเสิร์ตประจำปี', 'performance', '2025-11-15', '18:00', 'หอประชุมใหญ่', 'คอนเสิร์ตประจำปีของชมรมดนตรีสากล', 45, 1, 2, '2025-10-01 00:00:00', '2025-11-11 04:32:00'),
(2, 1, 'การประชุมประจำเดือน', 'meeting', '2025-11-20', '14:00', 'ห้องประชุม 101', 'การประชุมประจำเดือนเพื่อวางแผนกิจกรรม', 8, 1, 2, '2025-10-15 00:00:00', '2025-11-11 04:32:00'),
(3, 1, 'การซ้อมดนตรี', 'practice', '2025-11-12', '16:00', 'ห้องซ้อมดนตรี', 'การซ้อมดนตรีสำหรับสมาชิกใหม่', 32, 0, 2, '2025-11-01 00:00:00', '2025-11-11 04:32:00'),
(4, 3, 'เวิร์คช็อปศิลปะ', 'workshop', '2025-11-18', '10:00', 'ห้องศิลปะ', 'เวิร์คช็อปการวาดภาพสำหรับผู้เริ่มต้น', 15, 1, 4, '2025-10-20 00:00:00', '2025-11-11 04:32:00'),
(5, 2, 'การแข่งขันกีฬา', 'other', '2025-11-25', '08:00', 'สนามกีฬา', 'การแข่งขันกีฬาภายในชมรม', 20, 1, 3, '2025-10-25 00:00:00', '2025-11-11 04:32:00'),
(6, 1, 'Weekly Practice Session', 'practice', '2025-11-07', '16:00', 'ห้องซ้อมดนตรี', 'การซ้อมประจำสัปดาห์', 32, 0, 2, '2025-11-01 00:00:00', '2025-11-07 00:00:00'),
(7, 1, 'Monthly Committee Meeting', 'meeting', '2025-11-05', '14:00', 'ห้องประชุม', 'การประชุมคณะกรรมการประจำเดือน', 8, 1, 2, '2025-10-28 00:00:00', '2025-11-05 00:00:00'),
(8, 1, 'Community Concert', 'performance', '2025-11-02', '19:00', 'หอประชุม', 'คอนเสิร์ตชุมชน', 45, 1, 2, '2025-09-15 00:00:00', '2025-11-02 00:00:00'),
(9, 1, 'Workshop Planning', 'workshop', '2025-10-30', '10:00', 'ห้องกิจกรรม', 'การวางแผนเวิร์คช็อป', 15, 0, 2, '2025-10-20 00:00:00', '2025-10-30 00:00:00'),
(10, 1, 'Instrument Maintenance', 'other', '2025-10-28', '14:00', 'ห้องซ้อมดนตรี', 'การบำรุงรักษาเครื่องดนตรี', 12, 0, 2, '2025-10-15 00:00:00', '2025-10-28 00:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `club_memberships`
--

DROP TABLE IF EXISTS `club_memberships`;
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
-- Leaders
(1, 2, 1, 'approved', 'leader', '2025-01-10 00:00:00', '2025-01-10 00:00:00', 1, '2025-01-10 00:00:00', '2025-01-10 00:00:00'),
(2, 3, 2, 'approved', 'leader', '2025-01-15 00:00:00', '2025-01-15 00:00:00', 1, '2025-01-15 00:00:00', '2025-01-15 00:00:00'),
(3, 4, 3, 'approved', 'leader', '2025-01-20 00:00:00', '2025-01-20 00:00:00', 1, '2025-01-20 00:00:00', '2025-01-20 00:00:00'),
(4, 5, 4, 'approved', 'leader', '2025-01-08 00:00:00', '2025-01-08 00:00:00', 1, '2025-01-08 00:00:00', '2025-01-08 00:00:00'),
(5, 6, 5, 'approved', 'leader', '2025-01-22 00:00:00', '2025-01-22 00:00:00', 1, '2025-01-22 00:00:00', '2025-01-22 00:00:00'),
(6, 7, 6, 'approved', 'leader', '2025-02-08 00:00:00', '2025-02-08 00:00:00', 1, '2025-02-08 00:00:00', '2025-02-08 00:00:00'),
(7, 8, 7, 'approved', 'leader', '2025-02-12 00:00:00', '2025-02-12 00:00:00', 1, '2025-02-12 00:00:00', '2025-02-12 00:00:00'),
(8, 9, 8, 'approved', 'leader', '2025-02-22 00:00:00', '2025-02-22 00:00:00', 1, '2025-02-22 00:00:00', '2025-02-22 00:00:00'),
-- Club 1 Members (ชมรมดนตรีสากล)
(9, 10, 1, 'approved', 'member', '2025-01-20 00:00:00', '2025-01-21 00:00:00', 2, '2025-01-20 00:00:00', '2025-01-21 00:00:00'),
(10, 11, 1, 'approved', 'member', '2025-01-25 00:00:00', '2025-01-26 00:00:00', 2, '2025-01-25 00:00:00', '2025-01-26 00:00:00'),
(11, 12, 1, 'approved', 'member', '2025-02-01 00:00:00', '2025-02-02 00:00:00', 2, '2025-02-01 00:00:00', '2025-02-02 00:00:00'),
(12, 13, 1, 'approved', 'member', '2025-02-05 00:00:00', '2025-02-06 00:00:00', 2, '2025-02-05 00:00:00', '2025-02-06 00:00:00'),
(13, 14, 1, 'approved', 'member', '2025-02-10 00:00:00', '2025-02-11 00:00:00', 2, '2025-02-10 00:00:00', '2025-02-11 00:00:00'),
-- Club 2 Members (ชมรมกีฬาแบดมินตัน)
(14, 15, 2, 'approved', 'member', '2025-01-18 00:00:00', '2025-01-19 00:00:00', 3, '2025-01-18 00:00:00', '2025-01-19 00:00:00'),
(15, 16, 2, 'approved', 'member', '2025-01-22 00:00:00', '2025-01-23 00:00:00', 3, '2025-01-22 00:00:00', '2025-01-23 00:00:00'),
(16, 17, 2, 'approved', 'member', '2025-01-28 00:00:00', '2025-01-29 00:00:00', 3, '2025-01-28 00:00:00', '2025-01-29 00:00:00'),
-- Club 3 Members (ชมรมภาพถ่าย)
(17, 18, 3, 'approved', 'member', '2025-02-15 00:00:00', '2025-02-16 00:00:00', 4, '2025-02-15 00:00:00', '2025-02-16 00:00:00'),
(18, 19, 3, 'approved', 'member', '2025-02-18 00:00:00', '2025-02-19 00:00:00', 4, '2025-02-18 00:00:00', '2025-02-19 00:00:00'),
-- Club 4 Members (ชมรมหุ่นยนต์)
(19, 20, 4, 'approved', 'member', '2025-01-12 00:00:00', '2025-01-13 00:00:00', 5, '2025-01-12 00:00:00', '2025-01-13 00:00:00'),
(20, 21, 4, 'approved', 'member', '2025-01-16 00:00:00', '2025-01-17 00:00:00', 5, '2025-01-16 00:00:00', '2025-01-17 00:00:00'),
-- Club 5 Members (ชมรมอาสาพัฒนา)
(21, 22, 5, 'approved', 'member', '2025-01-28 00:00:00', '2025-01-29 00:00:00', 6, '2025-01-28 00:00:00', '2025-01-29 00:00:00'),
(22, 23, 5, 'approved', 'member', '2025-02-02 00:00:00', '2025-02-03 00:00:00', 6, '2025-02-02 00:00:00', '2025-02-03 00:00:00'),
-- Club 6 Members (ชมรมภาษาญี่ปุ่น)
(23, 24, 6, 'approved', 'member', '2025-02-12 00:00:00', '2025-02-13 00:00:00', 7, '2025-02-12 00:00:00', '2025-02-13 00:00:00'),
-- Club 7 Members (ชมรมการ์ตูนและอนิเมะ)
(24, 25, 7, 'approved', 'member', '2025-02-18 00:00:00', '2025-02-19 00:00:00', 8, '2025-02-18 00:00:00', '2025-02-19 00:00:00'),
-- Club 8 Members (ชมรมธุรกิจและการลงทุน)
(25, 26, 8, 'approved', 'member', '2025-02-25 00:00:00', '2025-02-26 00:00:00', 9, '2025-02-25 00:00:00', '2025-02-26 00:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `check_in_sessions`
--

DROP TABLE IF EXISTS `check_in_sessions`;
CREATE TABLE `check_in_sessions` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `passcode` varchar(6) NOT NULL,
  `qr_code_data` text NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `check_ins`
--

DROP TABLE IF EXISTS `check_ins`;
CREATE TABLE `check_ins` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `check_in_method` enum('qr','passcode') NOT NULL,
  `check_in_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
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
(1, 'suggestion', 'Request for More Microphones', 'ขอเสนอให้ซื้อไมโครโฟนเพิ่มเติม เพราะตอนนี้ไม่พอสำหรับการซ้อมของสมาชิกทุกคน', 14, 'in-review', 'Super Admin', NULL, NULL, '2025-11-06 10:30:00', '2025-11-06 10:30:00'),
(2, 'complaint', 'Practice Room Too Noisy', 'ห้องซ้อมมีเสียงรบกวนจากห้องข้างๆมากเกินไป ทำให้ซ้อมได้ไม่เต็มที่', 16, 'new', NULL, NULL, NULL, '2025-11-04 14:20:00', '2025-11-04 14:20:00'),
(3, 'appreciation', 'Great Workshop Last Week', 'ขอบคุณสำหรับเวิร์คช็อปที่จัดเมื่อสัปดาห์ที่แล้ว ได้ความรู้เยอะมากครับ', 20, 'resolved', 'Super Admin', 'ขอบคุณสำหรับกำลังใจครับ จะพยายามจัดกิจกรรมดีๆแบบนี้ต่อไป', '2025-11-05 15:30:00', '2025-11-05 09:15:00', '2025-11-05 15:30:00'),
(4, 'question', 'Upcoming Concert Date Confirmation', 'อยากขอยืนยันวันที่จัดคอนเสิร์ตหน่อยครับ เพราะไม่แน่ใจว่าวันที่ 15 หรือ 16', 19, 'resolved', 'Super Admin', 'คอนเสิร์ตจะจัดในวันที่ 15 พฤศจิกายน เวลา 19:00 น. ครับ', '2025-11-03 16:45:00', '2025-11-03 11:00:00', '2025-11-03 16:45:00'),
(5, 'issue', 'Request Approval Needed', 'ต้องการขออนุมัติสำหรับกิจกรรมพิเศษในเดือนหน้า', 2, 'new', NULL, NULL, NULL, '2025-11-07 08:00:00', '2025-11-07 08:00:00'),
(6, 'feedback', 'ข้อเสนอแนะเกี่ยวกับกิจกรรม', 'ขอเสนอแนะให้เพิ่มกิจกรรมในช่วงเย็นเพื่อให้สมาชิกที่เรียนช่วงเช้าสามารถเข้าร่วมได้', 10, 'new', NULL, NULL, NULL, '2025-11-05 10:00:00', '2025-11-05 10:00:00'),
(7, 'suggestion', 'ข้อเสนอแนะการจัดการ', 'ควรมีการแจ้งเตือนล่วงหน้าก่อนกิจกรรม 3 วัน', 11, 'resolved', 'Super Admin', 'ขอบคุณสำหรับข้อเสนอแนะ เราจะปรับปรุงระบบแจ้งเตือนให้ดีขึ้น', '2025-11-04 14:00:00', '2025-11-03 16:00:00', '2025-11-04 14:00:00'),
(8, 'complaint', 'ปัญหาอุปกรณ์', 'ไมโครโฟนในห้องซ้อมมีปัญหาเสียงไม่ชัด', 12, 'in-review', 'Super Admin', NULL, NULL, '2025-11-06 09:00:00', '2025-11-06 09:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
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
(1, 'admin@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'ประภาส', 'ผู้ดูแลระบบ', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'admin', NULL, NULL, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', '2025-01-01 00:00:00', '2025-11-11 06:03:05'),
(2, 'leader@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมหญิง', 'หัวหน้า', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 1, 'ชมรมดนตรีสากล', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader', '2025-01-10 00:00:00', '2025-11-11 06:03:05'),
(3, 'leader2@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'ศิริพร', 'นักกีฬา', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 2, 'ชมรมกีฬาแบดมินตัน', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader2', '2025-01-15 00:00:00', '2025-11-11 06:03:05'),
(4, 'leader3@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'วิชัย', 'ช่างภาพ', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 3, 'ชมรมภาพถ่าย', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader3', '2025-01-20 00:00:00', '2025-11-11 06:03:05'),
(5, 'leader4@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'ธนพล', 'วิศวกร', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 4, 'ชมรมหุ่นยนต์', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader4', '2025-01-08 00:00:00', '2025-11-11 06:03:05'),
(6, 'leader5@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'นภา', 'ใจดี', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 5, 'ชมรมอาสาพัฒนา', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader5', '2025-01-22 00:00:00', '2025-11-11 06:03:05'),
(7, 'leader6@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'พิมพ์ใจ', 'ซากุระ', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 6, 'ชมรมภาษาญี่ปุ่น', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader6', '2025-02-08 00:00:00', '2025-11-11 06:03:05'),
(8, 'leader7@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'ประภาส', 'มังงะ', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 7, 'ชมรมการ์ตูนและอนิเมะ', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader7', '2025-02-12 00:00:00', '2025-11-11 06:03:05'),
(9, 'leader8@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมชาย', 'นักธุรกิจ', NULL, 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'leader', 8, 'ชมรมธุรกิจและการลงทุน', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leader8', '2025-02-22 00:00:00', '2025-11-11 06:03:05'),
(10, 'member@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมชาย', 'ใจดี', '081-234-5678', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 1, 'ชมรมดนตรีสากล', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somchai', '2025-01-20 00:00:00', '2025-11-11 06:03:05'),
(11, 'member2@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมหญิง', 'รักดี', '082-345-6789', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 1, 'ชมรมดนตรีสากล', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somying', '2025-01-25 00:00:00', '2025-11-11 06:03:05'),
(12, 'member3@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'ประภาส', 'มั่นคง', '083-456-7890', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 1, 'ชมรมดนตรีสากล', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Prapas', '2025-02-01 00:00:00', '2025-11-11 06:03:05'),
(13, 'member4@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'วิชัย', 'สุขใจ', '084-567-8901', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 1, 'ชมรมดนตรีสากล', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wichai', '2025-02-05 00:00:00', '2025-11-11 06:03:05'),
(14, 'member5@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'นภา', 'สว่างใจ', '085-678-9012', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 1, 'ชมรมดนตรีสากล', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Napa', '2025-02-10 00:00:00', '2025-11-11 06:03:05'),
(15, 'member6@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'ธนพล', 'แข็งแรง', '086-789-0123', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 2, 'ชมรมกีฬาแบดมินตัน', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tanpon', '2025-01-18 00:00:00', '2025-11-11 06:03:05'),
(16, 'member7@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'พิมพ์ใจ', 'ดีงาม', '087-890-1234', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 2, 'ชมรมกีฬาแบดมินตัน', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pimjai', '2025-01-22 00:00:00', '2025-11-11 06:03:05'),
(17, 'member8@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'ศิริพร', 'รุ่งเรือง', '088-901-2345', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 2, 'ชมรมกีฬาแบดมินตัน', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siriporn', '2025-01-28 00:00:00', '2025-11-11 06:03:05'),
(18, 'member9@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมปอง', 'สุขสันต์', '089-012-3456', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 3, 'ชมรมภาพถ่าย', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sompong', '2025-02-15 00:00:00', '2025-11-11 06:03:05'),
(19, 'member10@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมเกียรติ', 'ถ่ายภาพ', '090-123-4567', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 3, 'ชมรมภาพถ่าย', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somkiat', '2025-02-18 00:00:00', '2025-11-11 06:03:05'),
(20, 'member11@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมศักดิ์', 'หุ่นยนต์', '091-234-5678', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 4, 'ชมรมหุ่นยนต์', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somsak', '2025-01-12 00:00:00', '2025-11-11 06:03:05'),
(21, 'member12@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมหมาย', 'โปรแกรม', '092-345-6789', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 4, 'ชมรมหุ่นยนต์', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sommai', '2025-01-16 00:00:00', '2025-11-11 06:03:05'),
(22, 'member13@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมบูรณ์', 'อาสา', '093-456-7890', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 5, 'ชมรมอาสาพัฒนา', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somboon', '2025-01-28 00:00:00', '2025-11-11 06:03:05'),
(23, 'member14@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมคิด', 'พัฒนา', '094-567-8901', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 5, 'ชมรมอาสาพัฒนา', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somkit', '2025-02-02 00:00:00', '2025-11-11 06:03:05'),
(24, 'member15@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมศักดิ์', 'ญี่ปุ่น', '095-678-9012', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 6, 'ชมรมภาษาญี่ปุ่น', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somsak2', '2025-02-12 00:00:00', '2025-11-11 06:03:05'),
(25, 'member16@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมเกียรติ', 'อนิเมะ', '096-789-0123', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 7, 'ชมรมการ์ตูนและอนิเมะ', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somkiat2', '2025-02-18 00:00:00', '2025-11-11 06:03:05'),
(26, 'member17@cmu.ac.th', '$2a$10$gPEjGaboESKjvIi1Wc2H7.ll4GUIq4AgkSfWovuiplfNy7dhNuFaq', 'สมชาย', 'ธุรกิจ', '097-890-1234', 'วิทยาลัยศิลปะ สื่อ และเทคโนโลยี', 'member', 8, 'ชมรมธุรกิจและการลงทุน', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somchai2', '2025-02-25 00:00:00', '2025-11-11 06:03:05');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `clubs`
--
ALTER TABLE `clubs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_president_id` (`president_id`),
  ADD KEY `idx_status` (`status`);

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
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_club_id` (`club_id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_type` (`type`);

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
-- Indexes for table `check_ins`
--
ALTER TABLE `check_ins`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_check_in_time` (`check_in_time`),
  ADD UNIQUE KEY `unique_event_user` (`event_id`, `user_id`);

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
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sender_id` (`sender_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_type` (`type`);

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
-- AUTO_INCREMENT for table `clubs`
--
ALTER TABLE `clubs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `check_in_sessions`
--
ALTER TABLE `check_in_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `check_ins`
--
ALTER TABLE `check_ins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `club_memberships`
--
ALTER TABLE `club_memberships`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `events_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `events_ibfk_2` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `clubs`
--
ALTER TABLE `clubs`
  ADD CONSTRAINT `clubs_ibfk_1` FOREIGN KEY (`president_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `check_in_sessions`
--
ALTER TABLE `check_in_sessions`
  ADD CONSTRAINT `check_in_sessions_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `check_in_sessions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `check_ins`
--
ALTER TABLE `check_ins`
  ADD CONSTRAINT `check_ins_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `check_ins_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `club_memberships`
--
ALTER TABLE `club_memberships`
  ADD CONSTRAINT `club_memberships_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `club_memberships_ibfk_2` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `club_memberships_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- --------------------------------------------------------

--
-- Table structure for table `club_assignments`
--

DROP TABLE IF EXISTS `club_assignments`;
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

-- --------------------------------------------------------

--
-- Table structure for table `assignment_submissions`
--

DROP TABLE IF EXISTS `assignment_submissions`;
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
-- Table structure for table `assignment_attachments`
--

DROP TABLE IF EXISTS `assignment_attachments`;
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

-- --------------------------------------------------------

--
-- Table structure for table `assignment_comments`
--

DROP TABLE IF EXISTS `assignment_comments`;
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

-- --------------------------------------------------------

--
-- Table structure for table `document_assignments`
--

DROP TABLE IF EXISTS `document_assignments`;
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

-- --------------------------------------------------------

--
-- Table structure for table `document_templates`
--

DROP TABLE IF EXISTS `document_templates`;
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
-- Table structure for table `smart_documents`
--

DROP TABLE IF EXISTS `smart_documents`;
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
-- Indexes for dumped tables
--

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
-- Indexes for table `smart_documents`
--
ALTER TABLE `smart_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_club_id` (`club_id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_due_date` (`due_date`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `club_assignments`
--
ALTER TABLE `club_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignment_attachments`
--
ALTER TABLE `assignment_attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignment_comments`
--
ALTER TABLE `assignment_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `document_assignments`
--
ALTER TABLE `document_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `document_templates`
--
ALTER TABLE `document_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `smart_documents`
--
ALTER TABLE `smart_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `club_assignments`
--
ALTER TABLE `club_assignments`
  ADD CONSTRAINT `club_assignments_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `club_assignments_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD CONSTRAINT `assignment_submissions_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `club_assignments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignment_submissions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `assignment_submissions_ibfk_3` FOREIGN KEY (`graded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

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
-- Constraints for table `smart_documents`
--
ALTER TABLE `smart_documents`
  ADD CONSTRAINT `smart_documents_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `smart_documents_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- --------------------------------------------------------

--
-- Table structure for table `email_otps`
--

DROP TABLE IF EXISTS `email_otps`;
CREATE TABLE `email_otps` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT 0,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for table `email_otps`
--

ALTER TABLE `email_otps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_email_created` (`email`, `created_at`),
  ADD KEY `idx_email_used` (`email`, `is_used`);

--
-- AUTO_INCREMENT for table `email_otps`
--

ALTER TABLE `email_otps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
