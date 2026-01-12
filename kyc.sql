-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 13, 2025 at 08:37 PM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 8.1.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `v5`
--

-- --------------------------------------------------------

--
-- Table structure for table `kyc_application`
--

CREATE TABLE `kyc_application` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `levelId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','ADDITIONAL_INFO_REQUIRED') NOT NULL DEFAULT 'PENDING',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`data`)),
  `adminNotes` text DEFAULT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `kyc_level`
--

CREATE TABLE `kyc_level` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `level` int(11) NOT NULL,
  `fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`fields`)),
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `status` enum('ACTIVE','DRAFT','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `serviceId` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `kyc_verification_result`
--

CREATE TABLE `kyc_verification_result` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `applicationId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `serviceId` varchar(191) NOT NULL,
  `status` enum('VERIFIED','FAILED','PENDING','NOT_STARTED') NOT NULL,
  `score` double DEFAULT NULL,
  `checks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`checks`)),
  `documentVerifications` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`documentVerifications`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `deletedAt` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `kyc_verification_service`
--

CREATE TABLE `kyc_verification_service` (
  `id` varchar(255) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` text NOT NULL,
  `type` varchar(50) NOT NULL,
  `integrationDetails` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`integrationDetails`)),
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `kyc_application`
--
ALTER TABLE `kyc_application`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`),
  ADD KEY `levelId` (`levelId`);

--
-- Indexes for table `kyc_level`
--
ALTER TABLE `kyc_level`
  ADD PRIMARY KEY (`id`),
  ADD KEY `serviceId` (`serviceId`);

--
-- Indexes for table `kyc_verification_result`
--
ALTER TABLE `kyc_verification_result`
  ADD PRIMARY KEY (`id`),
  ADD KEY `applicationId` (`applicationId`),
  ADD KEY `serviceId` (`serviceId`);

--
-- Indexes for table `kyc_verification_service`
--
ALTER TABLE `kyc_verification_service`
  ADD PRIMARY KEY (`id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `kyc_application`
--
ALTER TABLE `kyc_application`
  ADD CONSTRAINT `kyc_application_ibfk_1553` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `kyc_application_ibfk_1554` FOREIGN KEY (`levelId`) REFERENCES `kyc_level` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `kyc_level`
--
ALTER TABLE `kyc_level`
  ADD CONSTRAINT `kyc_level_ibfk_1` FOREIGN KEY (`serviceId`) REFERENCES `kyc_verification_service` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `kyc_verification_result`
--
ALTER TABLE `kyc_verification_result`
  ADD CONSTRAINT `kyc_verification_result_ibfk_1495` FOREIGN KEY (`applicationId`) REFERENCES `kyc_application` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `kyc_verification_result_ibfk_1496` FOREIGN KEY (`serviceId`) REFERENCES `kyc_verification_service` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
