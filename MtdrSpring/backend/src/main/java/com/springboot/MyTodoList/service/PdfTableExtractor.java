package com.springboot.MyTodoList.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.io.IOException;
import java.io.StringWriter;
import java.io.Writer;
import java.util.*;
import java.util.stream.Collectors;

/**
 * PDF text extractor with table-aware formatting.
 *
 * Uses PDFBox TextPosition coordinates to detect table rows and cells,
 * then formats them as "cell1 | cell2 | cell3" per row. Paragraph text
 * outside tables is preserved as-is.
 *
 * Compatible with PDFBox 3.x (no Tabula dependency).
 */
public class PdfTableExtractor {

    // Two text fragments on the same row if their Y positions differ by less than this
    private static final float ROW_Y_TOLERANCE   = 3.0f;
    // Two fragments in the same cell if horizontal gap is less than this (points)
    private static final float CELL_GAP_THRESHOLD = 15.0f;
    // Minimum number of distinct X-clusters in a line to treat it as a table row
    private static final int   MIN_COLUMNS_FOR_TABLE = 2;

    public static String extract(PDDocument pdf) throws IOException {
        PositionalStripper stripper = new PositionalStripper();
        stripper.setSortByPosition(true);
        // Trigger extraction — output discarded, we use captured positions
        StringWriter sink = new StringWriter();
        stripper.writeText(pdf, sink);

        StringBuilder result = new StringBuilder();
        for (PageLines page : stripper.pages) {
            for (TextLine line : page.lines) {
                result.append(line.formatted()).append("\n");
            }
            result.append("\n"); // blank line between pages
        }
        return result.toString().strip();
    }

    // ─── Internal PDFTextStripper subclass ───────────────────────────────

    private static class PositionalStripper extends PDFTextStripper {

        final List<PageLines> pages = new ArrayList<>();
        private final List<Fragment> currentPage = new ArrayList<>();

        PositionalStripper() throws IOException {}

        @Override
        protected void startPage(org.apache.pdfbox.pdmodel.PDPage page) throws IOException {
            currentPage.clear();
        }

        @Override
        protected void endPage(org.apache.pdfbox.pdmodel.PDPage page) throws IOException {
            pages.add(buildPageLines(new ArrayList<>(currentPage)));
            currentPage.clear();
        }

        @Override
        protected void writeString(String text, List<TextPosition> positions) throws IOException {
            if (positions == null || positions.isEmpty()) return;
            TextPosition first = positions.get(0);
            TextPosition last  = positions.get(positions.size() - 1);
            float x    = first.getXDirAdj();
            float y    = first.getYDirAdj();
            float xEnd = last.getXDirAdj() + last.getWidthDirAdj();
            currentPage.add(new Fragment(text.strip(), x, y, xEnd));
        }

        @Override
        protected void writeLineSeparator() {}

        @Override
        protected void writeWordSeparator() {}

        @Override
        protected void writeParagraphEnd() {}

        @Override
        protected void writeParagraphStart() {}

        @Override
        protected void writePageStart() {}

        @Override
        protected void writePageEnd() {}

        @Override
        public void writeText(PDDocument doc, Writer output) throws IOException {
            super.writeText(doc, output);
        }
    }

    // ─── Group fragments into lines, detect table rows ────────────────────

    private static PageLines buildPageLines(List<Fragment> fragments) {
        if (fragments.isEmpty()) return new PageLines(List.of());

        // Sort by Y then X
        fragments.sort(Comparator.comparingDouble((Fragment f) -> f.y)
                .thenComparingDouble(f -> f.x));

        // Group into rows by Y proximity
        List<List<Fragment>> rows = new ArrayList<>();
        List<Fragment> currentRow = new ArrayList<>();
        float lastY = fragments.get(0).y;

        for (Fragment f : fragments) {
            if (Math.abs(f.y - lastY) > ROW_Y_TOLERANCE && !currentRow.isEmpty()) {
                rows.add(new ArrayList<>(currentRow));
                currentRow.clear();
            }
            currentRow.add(f);
            lastY = f.y;
        }
        if (!currentRow.isEmpty()) rows.add(currentRow);

        // Convert each row to TextLine
        List<TextLine> lines = rows.stream()
                .filter(row -> !row.isEmpty())
                .map(PdfTableExtractor::buildLine)
                .filter(l -> !l.text.isBlank())
                .collect(Collectors.toList());

        return new PageLines(lines);
    }

    private static TextLine buildLine(List<Fragment> row) {
        if (row.size() == 1) return new TextLine(row.get(0).text, false);

        // Sort by X
        row.sort(Comparator.comparingDouble(f -> f.x));

        // Detect cells: merge adjacent fragments with small gap, split on large gap
        List<String> cells = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        float lastXEnd = row.get(0).xEnd;
        cell.append(row.get(0).text);

        for (int i = 1; i < row.size(); i++) {
            Fragment f = row.get(i);
            float gap = f.x - lastXEnd;
            if (gap > CELL_GAP_THRESHOLD) {
                String built = cell.toString().strip();
                if (!built.isEmpty()) cells.add(built);
                cell.setLength(0);
            } else {
                cell.append(" ");
            }
            cell.append(f.text);
            lastXEnd = Math.max(lastXEnd, f.xEnd);
        }
        String last = cell.toString().strip();
        if (!last.isEmpty()) cells.add(last);

        boolean isTable = cells.size() >= MIN_COLUMNS_FOR_TABLE;
        String text = isTable
                ? String.join(" | ", cells)
                : cells.stream().collect(Collectors.joining(" "));

        return new TextLine(text, isTable);
    }

    // ─── Value types ─────────────────────────────────────────────────────

    private record Fragment(String text, float x, float y, float xEnd) {}

    private record TextLine(String text, boolean isTableRow) {
        String formatted() { return text; }
    }

    private record PageLines(List<TextLine> lines) {}
}
