// ==UserScript==
// @name         楽楽販売 - Absence Hour Calculator
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Tự động tính toán số giờ nghỉ phép dựa trên giờ From và To, không tính thời gian nghỉ trưa (12h-13h)
// @author       Claude
// @match        https://ta.htdb.jp/z24nv8a/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Hàm tìm element theo tên cột header
    function findFieldByHeader(headerText) {
        // Tìm tất cả các th có text khớp với headerText
        const headers = Array.from(document.querySelectorAll('th.edit'));
        const targetHeader = headers.find(th => th.textContent.includes(headerText));

        if (!targetHeader) return null;

        // Lấy ID của header (ví dụ: tr_102234)
        const headerId = targetHeader.id;
        if (!headerId) return null;

        // Trích xuất số ID (ví dụ: 102234)
        const fieldId = headerId.replace('tr_', '');
        return fieldId;
    }

    // Hàm lấy giá trị giờ/phút từ select elements
    function getTimeValue(fieldId, type) {
        const element = document.getElementById(`${type}_${fieldId}`);
        return parseInt(element?.value || '0');
    }

    // Hàm tính toán số giờ nghỉ
    function calculateAbsentHours() {
        // Tìm field ID cho From và To dựa trên header
        const fromFieldId = findFieldByHeader('From');
        const toFieldId = findFieldByHeader('To');
        const hourAbsentFieldId = findFieldByHeader('Hour Absent');

        if (!fromFieldId || !toFieldId || !hourAbsentFieldId) {
            console.warn('Absence Calculator: Không tìm thấy các trường cần thiết');
            return;
        }

        // Lấy giá trị From
        const fromHour = getTimeValue(fromFieldId, 'hour');
        const fromMinute = getTimeValue(fromFieldId, 'minute');

        // Lấy giá trị To
        const toHour = getTimeValue(toFieldId, 'hour');
        const toMinute = getTimeValue(toFieldId, 'minute');

        // Kiểm tra nếu các giá trị hợp lệ
        if (isNaN(fromHour) || isNaN(fromMinute) || isNaN(toHour) || isNaN(toMinute)) {
            return;
        }

        // Chuyển đổi sang phút để tính toán dễ dàng hơn
        const fromTotalMinutes = fromHour * 60 + fromMinute;
        const toTotalMinutes = toHour * 60 + toMinute;

        // Kiểm tra nếu To phải lớn hơn From
        if (toTotalMinutes <= fromTotalMinutes) {
            const hourAbsentField = document.getElementById(`field_${hourAbsentFieldId}`);
            if (hourAbsentField) {
                hourAbsentField.value = '0';
            }
            return;
        }

        // Tính tổng số phút làm việc
        let totalMinutes = toTotalMinutes - fromTotalMinutes;

        // Thời gian nghỉ trưa: 12:00 - 13:00 (720 phút đến 780 phút)
        const lunchStart = 12 * 60; // 12:00 = 720 phút
        const lunchEnd = 13 * 60;   // 13:00 = 780 phút

        // Kiểm tra xem có bị trùng với giờ nghỉ trưa không
        if (fromTotalMinutes < lunchEnd && toTotalMinutes > lunchStart) {
            // Tính phần trùng với giờ nghỉ trưa
            const overlapStart = Math.max(fromTotalMinutes, lunchStart);
            const overlapEnd = Math.min(toTotalMinutes, lunchEnd);
            const lunchMinutes = overlapEnd - overlapStart;

            // Trừ đi thời gian nghỉ trưa
            totalMinutes -= lunchMinutes;
        }

        // Chuyển đổi từ phút sang giờ (làm tròn 2 chữ số thập phân)
        const absentHours = (totalMinutes / 60).toFixed(2);

        // Cập nhật vào trường Hour Absent
        const hourAbsentField = document.getElementById(`field_${hourAbsentFieldId}`);
        if (hourAbsentField) {
            hourAbsentField.value = absentHours;

            // Thay đổi màu nền để báo hiệu đã được tính toán
            hourAbsentField.style.background = '#e6f9ff';

            console.log(`Absence Calculator: Đã tính toán ${absentHours} giờ (${fromHour}:${fromMinute} → ${toHour}:${toMinute})`);
        }
    }

    // Hàm khởi tạo các sự kiện lắng nghe
    function initializeListeners() {
        // Tìm field ID cho From và To dựa trên header
        const fromFieldId = findFieldByHeader('From');
        const toFieldId = findFieldByHeader('To');

        if (!fromFieldId || !toFieldId) {
            console.warn('Absence Calculator: Không tìm thấy form phù hợp');
            return;
        }

        // Tìm các dropdown của From và To
        const fromHourSelect = document.getElementById(`hour_${fromFieldId}`);
        const fromMinuteSelect = document.getElementById(`minute_${fromFieldId}`);
        const toHourSelect = document.getElementById(`hour_${toFieldId}`);
        const toMinuteSelect = document.getElementById(`minute_${toFieldId}`);

        // Thêm sự kiện change cho tất cả các dropdown
        if (fromHourSelect) {
            fromHourSelect.addEventListener('change', calculateAbsentHours);
        }
        if (fromMinuteSelect) {
            fromMinuteSelect.addEventListener('change', calculateAbsentHours);
        }
        if (toHourSelect) {
            toHourSelect.addEventListener('change', calculateAbsentHours);
        }
        if (toMinuteSelect) {
            toMinuteSelect.addEventListener('change', calculateAbsentHours);
        }

        console.log(`Absence Hour Calculator: Đã khởi tạo thành công! (From ID: ${fromFieldId}, To ID: ${toFieldId})`);

        // Tính toán ngay lần đầu nếu đã có giá trị
        calculateAbsentHours();
    }

    // Chờ DOM tải xong rồi mới khởi tạo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeListeners);
    } else {
        // DOM đã tải xong
        initializeListeners();
    }

    // Đối với các trang sử dụng iframe, có thể cần thêm delay
    setTimeout(function() {
        // Kiểm tra xem có đang trong iframe không
        if (window.name === 'main') {
            initializeListeners();
        }
    }, 1000);

})();
