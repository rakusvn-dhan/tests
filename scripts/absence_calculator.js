// ==UserScript==
// @name         楽楽販売 - Absence Hour Calculator + Auto Fill
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  [Chỉ chạy trên trang Absence Regist] Tự động điền Employee Number + Nhấn nút 取得 + Tính toán giờ nghỉ phép (không tính 12h-13h)
// @author       Claude
// @match        https://ta.htdb.jp/z24nv8a/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Kiểm tra xem trang có chứa "Absence Regist" không
    function isAbsenceRegistPage() {
        return document.body.textContent.includes('Absence Regist');
    }

    // Nếu không phải trang Absence Regist, không chạy script
    if (!isAbsenceRegistPage()) {
        console.log('Script chỉ chạy trên trang Absence Regist');
        return;
    }

    const employeeNumberToFill = 'R122'; // Mã nhân viên để tự động điền

    // Hàm tìm element theo tên cột header
    function findFieldByHeader(headerText) {
        // Tìm tất cả các th (không giới hạn class)
        const headers = Array.from(document.querySelectorAll('th'));

        // Tìm header có text khớp chính xác (loại bỏ khoảng trắng và dấu *)
        const targetHeader = headers.find(th => {
            const cleanText = th.textContent.replace(/\*/g, '').trim();
            return cleanText === headerText || cleanText.includes(headerText);
        });

        if (!targetHeader) return null;

        // Lấy ID của header (ví dụ: tr_102234)
        const headerId = targetHeader.id;
        if (!headerId) return null;

        // Trích xuất số ID (ví dụ: 102234)
        const fieldId = headerId.replace('tr_', '');
        return fieldId;
    }

    // Hàm tự động điền Employee Number và nhấn nút "取得"
    function autoFillEmployeeNumber() {
        const employeeFieldId = findFieldByHeader('Employee Number');
        if (!employeeFieldId) return;

        const employeeInput = document.getElementById(`field_${employeeFieldId}`);
        if (!employeeInput) return;

        // Kiểm tra xem trường đã có giá trị chưa
        if (employeeInput.value && employeeInput.value.trim() !== '') return;

        // Điền Employee Number vào trường
        employeeInput.value = employeeNumberToFill;

        // Trigger các sự kiện để form nhận biết thay đổi
        employeeInput.dispatchEvent(new Event('input', { bubbles: true }));
        employeeInput.dispatchEvent(new Event('change', { bubbles: true }));
        employeeInput.dispatchEvent(new Event('keyup', { bubbles: true }));

        // Tìm và nhấn nút "取得"
        setTimeout(function() {
            const label = employeeInput.closest('label');
            if (label) {
                const getButton = Array.from(label.querySelectorAll('a')).find(a => a.textContent.includes('取得'));
                if (getButton) {
                    getButton.click();
                }
            }
        }, 500);
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

        if (!fromFieldId || !toFieldId || !hourAbsentFieldId) return;

        // Lấy giá trị From và To
        const fromHour = getTimeValue(fromFieldId, 'hour');
        const fromMinute = getTimeValue(fromFieldId, 'minute');
        const toHour = getTimeValue(toFieldId, 'hour');
        const toMinute = getTimeValue(toFieldId, 'minute');

        // Kiểm tra nếu các giá trị hợp lệ
        if (isNaN(fromHour) || isNaN(fromMinute) || isNaN(toHour) || isNaN(toMinute)) return;

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
        }
    }

    // Hàm khởi tạo các sự kiện lắng nghe
    function initializeListeners() {
        const fromFieldId = findFieldByHeader('From');
        const toFieldId = findFieldByHeader('To');

        if (!fromFieldId || !toFieldId) return;

        // Tìm các dropdown của From và To
        const fromHourSelect = document.getElementById(`hour_${fromFieldId}`);
        const fromMinuteSelect = document.getElementById(`minute_${fromFieldId}`);
        const toHourSelect = document.getElementById(`hour_${toFieldId}`);
        const toMinuteSelect = document.getElementById(`minute_${toFieldId}`);

        // Thêm sự kiện change cho tất cả các dropdown
        if (fromHourSelect) fromHourSelect.addEventListener('change', calculateAbsentHours);
        if (fromMinuteSelect) fromMinuteSelect.addEventListener('change', calculateAbsentHours);
        if (toHourSelect) toHourSelect.addEventListener('change', calculateAbsentHours);
        if (toMinuteSelect) toMinuteSelect.addEventListener('change', calculateAbsentHours);

        // Tính toán ngay lần đầu nếu đã có giá trị
        calculateAbsentHours();
    }

    // Chờ DOM tải xong rồi mới khởi tạo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initializeListeners();
            autoFillEmployeeNumber();
        });
    } else {
        // DOM đã tải xong
        initializeListeners();
        autoFillEmployeeNumber();
    }

    // Đối với các trang sử dụng iframe, có thể cần thêm delay
    setTimeout(function() {
        // Kiểm tra xem có đang trong iframe không
        if (window.name === 'main') {
            initializeListeners();
            autoFillEmployeeNumber();
        }
    }, 1000);

})();
