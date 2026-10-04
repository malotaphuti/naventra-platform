package com.fleetops.service.report;

import com.fleetops.dto.report.ReportResponse;
import com.fleetops.exception.BusinessRuleException;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Component
public class ReportExporter {

    public enum Format {
        CSV("csv", "text/csv; charset=UTF-8"),
        XLSX("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        PDF("pdf", "application/pdf");

        public final String extension;
        public final String contentType;

        Format(String extension, String contentType) {
            this.extension = extension;
            this.contentType = contentType;
        }

        public static Format parse(String value) {
            String v = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
            return switch (v) {
                case "csv" -> CSV;
                case "xlsx", "excel" -> XLSX;
                case "pdf" -> PDF;
                default -> throw new BusinessRuleException("Unsupported export format: " + value);
            };
        }
    }

    private static final DateTimeFormatter GENERATED = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public byte[] export(ReportResponse report, Format format) {
        try {
            return switch (format) {
                case CSV -> toCsv(report);
                case XLSX -> toXlsx(report);
                case PDF -> toPdf(report);
            };
        } catch (IOException | DocumentException ex) {
            throw new IllegalStateException("Failed to export report " + report.getKey(), ex);
        }
    }

    // ---------------------------------------------------------------- CSV

    private byte[] toCsv(ReportResponse report) {
        StringBuilder sb = new StringBuilder("﻿");
        appendCsvLine(sb, report.getColumns());
        for (List<Object> row : report.getRows()) {
            appendCsvLine(sb, row);
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private void appendCsvLine(StringBuilder sb, List<?> cells) {
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            String text = text(cells.get(i));
            if (text.contains(",") || text.contains("\"") || text.contains("\n") || text.contains("\r")) {
                sb.append('"').append(text.replace("\"", "\"\"")).append('"');
            } else {
                sb.append(text);
            }
        }
        sb.append("\r\n");
    }

    // ---------------------------------------------------------------- XLSX

    private byte[] toXlsx(ReportResponse report) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(sheetName(report.getTitle()));
            int[] widths = new int[report.getColumns().size()];

            org.apache.poi.ss.usermodel.Font bold = workbook.createFont();
            bold.setBold(true);
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(bold);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            CellStyle titleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);
            CellStyle decimalStyle = workbook.createCellStyle();
            decimalStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));

            int r = 0;
            Row title = sheet.createRow(r++);
            Cell titleCell = title.createCell(0);
            titleCell.setCellValue(report.getTitle());
            titleCell.setCellStyle(titleStyle);
            sheet.createRow(r++).createCell(0).setCellValue(subtitle(report));
            r++;

            Row header = sheet.createRow(r++);
            for (int c = 0; c < report.getColumns().size(); c++) {
                Cell cell = header.createCell(c);
                cell.setCellValue(report.getColumns().get(c));
                cell.setCellStyle(headerStyle);
                widths[c] = report.getColumns().get(c).length() + 2;
            }
            sheet.createFreezePane(0, r);

            for (List<Object> values : report.getRows()) {
                Row row = sheet.createRow(r++);
                for (int c = 0; c < values.size(); c++) {
                    Object value = values.get(c);
                    if (value == null) {
                        continue;
                    }
                    Cell cell = row.createCell(c);
                    if (c < widths.length) {
                        widths[c] = Math.max(widths[c], text(value).length() + 1);
                    }
                    if (value instanceof Number n) {
                        cell.setCellValue(n.doubleValue());
                        if (value instanceof BigDecimal || value instanceof Double) {
                            cell.setCellStyle(decimalStyle);
                        }
                    } else {
                        cell.setCellValue(value.toString());
                    }
                }
            }
            // Sized from text length: POI's autoSizeColumn needs AWT fonts, which the Alpine runtime image lacks.
            for (int c = 0; c < widths.length; c++) {
                sheet.setColumnWidth(c, Math.min(Math.max(widths[c], 8), 60) * 256);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private static String sheetName(String title) {
        String cleaned = title.replaceAll("[\\\\/?*\\[\\]:]", " ");
        return cleaned.length() > 31 ? cleaned.substring(0, 31) : cleaned;
    }

    // ---------------------------------------------------------------- PDF

    private byte[] toPdf(ReportResponse report) throws DocumentException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate(), 28, 28, 32, 36);
        PdfWriter writer = PdfWriter.getInstance(document, out);
        writer.setPageEvent(new PageNumbers());
        document.addTitle(report.getTitle());
        document.addCreator("FleetOps");
        document.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(15, 23, 42));
        Font metaFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(100, 116, 139));
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
        Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(30, 41, 59));

        document.add(new Paragraph("FleetOps — " + report.getTitle(), titleFont));
        Paragraph meta = new Paragraph(subtitle(report), metaFont);
        meta.setSpacingAfter(10);
        document.add(meta);

        int columns = report.getColumns().size();
        PdfPTable table = new PdfPTable(columns);
        table.setWidthPercentage(100);
        table.setHeaderRows(1);
        Color headerBg = new Color(30, 64, 175);
        Color stripe = new Color(241, 245, 249);
        for (String column : report.getColumns()) {
            PdfPCell cell = new PdfPCell(new Phrase(column, headerFont));
            cell.setBackgroundColor(headerBg);
            cell.setPadding(5);
            cell.setBorderColor(headerBg);
            table.addCell(cell);
        }
        int index = 0;
        for (List<Object> row : report.getRows()) {
            for (int c = 0; c < columns; c++) {
                Object value = c < row.size() ? row.get(c) : null;
                PdfPCell cell = new PdfPCell(new Phrase(text(value), cellFont));
                cell.setPadding(4);
                cell.setBorderColor(new Color(226, 232, 240));
                if (value instanceof Number) {
                    cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                }
                if (index % 2 == 1) {
                    cell.setBackgroundColor(stripe);
                }
                table.addCell(cell);
            }
            index++;
        }
        if (report.getRows().isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No data for this period", cellFont));
            empty.setColspan(columns);
            empty.setPadding(8);
            empty.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(empty);
        }
        document.add(table);
        document.close();
        return out.toByteArray();
    }

    private static final class PageNumbers extends PdfPageEventHelper {
        private final Font font = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(100, 116, 139));

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            ColumnText.showTextAligned(writer.getDirectContent(), Element.ALIGN_RIGHT,
                    new Phrase("Page " + writer.getPageNumber(), font),
                    document.right(), document.bottom() - 18, 0);
        }
    }

    // ---------------------------------------------------------------- shared

    private static String subtitle(ReportResponse report) {
        return "Period: " + report.getFrom() + " to " + report.getTo()
                + "   ·   Generated: " + report.getGeneratedAt().format(GENERATED);
    }

    private static String text(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof BigDecimal bd) {
            return bd.toPlainString();
        }
        return value.toString();
    }
}
