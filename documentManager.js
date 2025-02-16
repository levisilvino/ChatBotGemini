const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

class DocumentManager {
    constructor() {
        this.documentsPath = path.join(__dirname, 'documents');
        this.documents = [];
        this.chatHistory = [];
        this.historyPath = path.join(__dirname, 'chat_history.json');
        this.greetings = ['oi', 'olá', 'ola', 'hey', 'ei', 'bom dia', 'boa tarde', 'boa noite'];
        this.loadHistory();
    }

    isGreeting(message) {
        message = message.toLowerCase().trim();
        return this.greetings.includes(message) || 
               this.greetings.some(greeting => message.startsWith(greeting + ' '));
    }

    async loadHistory() {
        try {
            const historyData = await fs.readFile(this.historyPath, 'utf-8');
            this.chatHistory = JSON.parse(historyData);
        } catch (error) {
            console.log('Histórico não encontrado, criando novo...');
            this.chatHistory = [];
            await this.saveHistory();
        }
    }

    async saveHistory() {
        try {
            await fs.writeFile(this.historyPath, JSON.stringify(this.chatHistory, null, 2));
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    }

    async addToHistory(message, isUser = true) {
        this.chatHistory.push({
            role: isUser ? 'user' : 'assistant',
            content: message,
            timestamp: new Date().toISOString()
        });
        await this.saveHistory();
        return this.chatHistory;
    }

    getHistory() {
        return this.chatHistory;
    }

    async clearHistory() {
        this.chatHistory = [];
        await this.saveHistory();
        return { success: true, message: 'Histórico limpo com sucesso!' };
    }

    async loadDocument(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        let content = '';

        try {
            switch (extension) {
                case '.txt':
                    content = await fs.readFile(filePath, 'utf-8');
                    break;
                case '.pdf':
                    const pdfBuffer = await fs.readFile(filePath);
                    const pdfData = await pdfParse(pdfBuffer);
                    content = pdfData.text;
                    break;
                case '.docx':
                    const docxBuffer = await fs.readFile(filePath);
                    const result = await mammoth.extractRawText({ buffer: docxBuffer });
                    content = result.value;
                    break;
                default:
                    throw new Error(`Formato de arquivo não suportado: ${extension}`);
            }

            // Divide o conteúdo em seções menores para melhor busca
            const sections = this.splitIntoSections(content);
            
            const documentInfo = {
                path: filePath,
                name: path.basename(filePath),
                sections: sections
            };

            // Remove versão anterior do documento se existir
            this.documents = this.documents.filter(doc => doc.path !== filePath);
            this.documents.push(documentInfo);

            console.log(`Documento carregado: ${documentInfo.name} com ${sections.length} seções`);
            return content;
        } catch (error) {
            console.error(`Erro ao carregar documento ${filePath}:`, error);
            throw error;
        }
    }

    splitIntoSections(content) {
        // Divide o conteúdo em seções baseadas em parágrafos ou títulos
        const sections = content.split(/\n\s*\n/); // Divide por linhas em branco
        return sections
            .map(section => section.trim())
            .filter(section => section.length > 0)
            .map((section, index) => ({
                id: index,
                content: section
            }));
    }

    async loadAllDocuments() {
        try {
            await fs.mkdir(this.documentsPath, { recursive: true });
            const files = await fs.readdir(this.documentsPath);
            for (const file of files) {
                const filePath = path.join(this.documentsPath, file);
                await this.loadDocument(filePath);
            }
            console.log(`${this.documents.length} documentos carregados`);
        } catch (error) {
            console.error('Erro ao carregar documentos:', error);
            throw error;
        }
    }

    findRelevantContent(query) {
        if (this.isGreeting(query)) {
            return [];
        }

        const queryTerms = query.toLowerCase().split(' ');
        const relevantSections = [];
        
        for (const doc of this.documents) {
            for (const section of doc.sections) {
                const sectionContent = section.content.toLowerCase();
                
                // Calcula a relevância baseada no número de termos encontrados
                const relevance = queryTerms.reduce((score, term) => {
                    if (term.length < 3) return score; // Ignora palavras muito curtas
                    return score + (sectionContent.includes(term) ? 1 : 0);
                }, 0);

                if (relevance > 0) {
                    relevantSections.push({
                        source: doc.name,
                        content: section.content,
                        relevance: relevance
                    });
                }
            }
        }
        
        // Ordena por relevância e limita a 5 seções mais relevantes
        return relevantSections
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 5);
    }

    getContext(query) {
        if (this.isGreeting(query)) {
            return '';
        }

        const relevantSections = this.findRelevantContent(query);
        
        if (relevantSections.length === 0) {
            return 'Não foram encontradas informações relevantes nos documentos disponíveis.';
        }

        // Formata o contexto para enviar ao modelo
        let context = 'Informações relevantes encontradas nos documentos:\n\n';
        relevantSections.forEach(section => {
            context += `[Fonte: ${section.source}]\n${section.content}\n\n`;
        });

        return context;
    }
}

module.exports = DocumentManager;
