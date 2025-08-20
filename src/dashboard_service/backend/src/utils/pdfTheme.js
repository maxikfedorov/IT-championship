// backend/src/utils/pdfTheme.js

// Дизайн-система для PDF в стиле строгих отчётов (без скруглений)
export const PDF_THEME = {
    colors: {
        primary: '#6366f1',
        primaryLight: '#a5b4fc',
        success: '#10b981',
        successLight: '#6ee7b7',
        warning: '#f59e0b',
        warningLight: '#fcd34d',
        danger: '#ef4444',
        dangerLight: '#fca5a5',

        // Нейтральные
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        background: '#f8fafc',
        cardBg: '#ffffff'
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        xxl: 32
    },

    fonts: {
        title: { size: 22, font: 'Helvetica-Bold' },
        subtitle: { size: 16, font: 'Helvetica-Bold' },
        heading: { size: 14, font: 'Helvetica-Bold' },
        body: { size: 11, font: 'Helvetica' },
        small: { size: 9, font: 'Helvetica' },
        caption: { size: 8, font: 'Helvetica' }
    },

    components: {
        header: {
            height: 80
        },
        table: {
            headerHeight: 28,
            rowHeight: 22,
            borderWidth: 0.5
        },
        card: {
            padding: 14,
            borderWidth: 1
        }
    }
};


// Утилиты для PDF дизайна
export class PDFDesigner {
    constructor(doc, theme = PDF_THEME) {
        this.doc = doc;
        this.theme = theme;
        this.currentY = 40;
    }

    // Сброс стилей
    resetStyles() {
        this.doc.fillOpacity(1)
            .strokeOpacity(1)
            .fillColor(this.theme.colors.textPrimary);
        return this;
    }

    // Заголовок отчёта
    renderHeader(title, subtitle, metadata = {}) {
        const { doc, theme } = this;
        const startY = this.currentY;

        // Фон прямоугольником (без скруглений)
        doc.rect(40, startY, 515, 75)
            .fillColor(theme.colors.primary)
            .fillOpacity(0.08)
            .fill();

        this.resetStyles();

        // Заголовок
        doc.fillColor(theme.colors.primary)
            .fontSize(theme.fonts.title.size)
            .font(theme.fonts.title.font)
            .text(title, 60, startY + 18);

        // Подзаголовок
        if (subtitle) {
            this.resetStyles()
                .doc.fillColor(theme.colors.textSecondary)
                .fontSize(theme.fonts.body.size)
                .font(theme.fonts.body.font)
                .text(subtitle, 60, startY + 42);
        }

        // Метаданные
        const metadataText = Object.entries(metadata)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' • ');

        if (metadataText) {
            this.resetStyles()
                .doc.fillColor(theme.colors.textMuted)
                .fontSize(theme.fonts.small.size)
                .text(metadataText, 60, startY + 58);
        }

        this.currentY = startY + 95;
        return this;
    }

    // Статистические карточки (адаптивно по числу элементов)
    renderStatsCards(stats) {
        const { doc, theme } = this;
        const startX = 40;          // левый отступ
        const usableWidth = 515;    // ширина области контента
        const gap = 15;             // расстояние между карточками

        // рассчитываем ширину карточки = доступное пространство / n - промежутки
        const cardWidth = (usableWidth - gap * (stats.length - 1)) / stats.length;
        const cardHeight = 65;
        const startY = this.currentY;

        stats.forEach((stat, index) => {
            const x = startX + (cardWidth + gap) * index;

            // Карточка
            doc.rect(x, startY, cardWidth, cardHeight)
                .fillColor(theme.colors.cardBg)
                .fill()
                .strokeColor(theme.colors.border)
                .stroke();

            // Цветная полоска сверху
            doc.rect(x, startY, cardWidth, 4)
                .fillColor(stat.color || theme.colors.primary)
                .fill();

            this.resetStyles();

            // Значение
            doc.fillColor(stat.color || theme.colors.primary)
                .fontSize(20)
                .font('Helvetica-Bold')
                .text(String(stat.value), x + 10, startY + 18, {
                    width: cardWidth - 20,
                    align: 'left'
                });

            // Подпись
            this.resetStyles()
                .doc.fillColor(theme.colors.textSecondary)
                .fontSize(theme.fonts.small.size)
                .text(stat.label, x + 10, startY + 38, {
                    width: cardWidth - 20,
                    align: 'left'
                });

            if (stat.subtitle) {
                this.resetStyles()
                    .doc.fillColor(theme.colors.textMuted)
                    .fontSize(7)
                    .text(stat.subtitle, x + 10, startY + 50, {
                        width: cardWidth - 20,
                        align: 'left'
                    });
            }
        });

        this.currentY = startY + cardHeight + theme.spacing.xl;
        return this;
    }


    // Таблица
    renderTable(data, columns, title = null) {
        const { doc, theme } = this;
        const tableWidth = 515;
        const startX = 40;
        let currentY = this.currentY;

        if (title) {
            this.resetStyles()
                .doc.fillColor(theme.colors.textPrimary)
                .fontSize(theme.fonts.heading.size)
                .font(theme.fonts.heading.font)
                .text(title, startX, currentY);
            currentY += 30;
        }

        const colWidth = tableWidth / columns.length;

        // Заголовки
        doc.rect(startX, currentY, tableWidth, theme.components.table.headerHeight)
            .fillColor(theme.colors.primary)
            .fillOpacity(0.12)
            .fill();

        this.resetStyles();

        columns.forEach((col, index) => {
            const x = startX + colWidth * index;
            doc.fillColor(theme.colors.primary)
                .fontSize(theme.fonts.small.size)
                .font('Helvetica-Bold')
                .text(col.header, x + 8, currentY + 8, {
                    width: colWidth - 16,
                    align: col.align || 'left'
                });
        });

        currentY += theme.components.table.headerHeight;

        // Строки
        data.forEach((row, rowIndex) => {
            const rowY = currentY + rowIndex * theme.components.table.rowHeight;

            if (rowIndex % 2 === 1) {
                doc.rect(startX, rowY, tableWidth, theme.components.table.rowHeight)
                    .fillColor(theme.colors.background)
                    .fillOpacity(0.5)
                    .fill();
            }

            this.resetStyles();

            columns.forEach((col, colIndex) => {
                const x = startX + colWidth * colIndex;
                const value = row[col.key];
                const formattedValue = col.formatter ? col.formatter(value) : String(value);

                let textColor = theme.colors.textPrimary;
                if (col.colorCondition) textColor = col.colorCondition(value);

                doc.fillColor(textColor)
                    .fontSize(theme.fonts.small.size)
                    .font(theme.fonts.small.font)
                    .text(formattedValue, x + 8, rowY + 6, {
                        width: colWidth - 16,
                        align: col.align || 'left'
                    });
            });
        });

        // Границы таблицы
        const totalHeight = theme.components.table.headerHeight +
            data.length * theme.components.table.rowHeight;

        doc.rect(startX, this.currentY + (title ? 30 : 0), tableWidth, totalHeight)
            .strokeColor(theme.colors.border)
            .strokeOpacity(0.6)
            .stroke();

        this.currentY = currentY + data.length * theme.components.table.rowHeight + theme.spacing.xl;
        return this;
    }

    // Divider
    renderDivider(title = null) {
        const { doc, theme } = this;

        if (title) {
            this.resetStyles()
                .doc.fillColor(theme.colors.textSecondary)
                .fontSize(theme.fonts.subtitle.size)
                .font(theme.fonts.subtitle.font)
                .text(title, 40, this.currentY);
            this.currentY += 30;
        }

        doc.rect(40, this.currentY, 515, 2)
            .fillColor(theme.colors.border)
            .fillOpacity(0.3)
            .fill();

        this.currentY += theme.spacing.lg;
        return this;
    }

    // Бейдж без скруглений
    renderBadge(text, color, x, y) {
        const { doc } = this;
        const width = text.length * 7 + 18;
        const height = 20;

        doc.rect(x, y, width, height)
            .fillColor(color)
            .fillOpacity(0.15)
            .fill()
            .strokeColor(color)
            .strokeOpacity(0.4)
            .stroke();

        this.resetStyles()
            .doc.fillColor(color)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(text, x + 9, y + 6);

        return width;
    }

    // Проверка на разрыв страницы
    checkPageBreak(requiredSpace = 100) {
        if (this.currentY + requiredSpace > 750) {
            this.addPage();
        }
        return this;
    }

    // Добавление страницы
    addPage() {
        this.doc.addPage();
        this.currentY = 40;
        this.resetStyles();
        return this;
    }
}
