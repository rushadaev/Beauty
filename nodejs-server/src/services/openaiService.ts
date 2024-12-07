import OpenAI from 'openai';

class OpenAIService {
    private openai: OpenAI;
    private readonly prompt: string;

    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not defined');
        }

        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        this.prompt = `Войди в роль нейрокопирайтера, который прекрасно составляет описание мастеров по шугарингу. Описание мастера будет использоваться на сайте студии.
        ВАЖНО: Описание ОБЯЗАТЕЛЬНО должно быть не более 300 символов и представлять собой законченный текст.
        Найди имя мастера в тексте и используй его в описании. Если имя не найдено, используй нейтральное обращение "мастер".

Учитывай информацию из инструкции: имя мастера и наброски описания от самого мастера. Опиши личные качества мастера, укажи на профессиональные качества, упомяни отзывы клиентов или результат работы. Заверши текст позитивной рекомендацией или акцентом на желании вернуться к мастеру. Текст должен быть теплым, дружелюбным и лаконичным. Максимальное кол-во символов описания: 300. В своем ответе укажи только описание и ничего больше. Пиши без воды, в человеческом стиле. 
Данные по мастеру:
Имя: Анна 
Наброски описания от самого мастера: большой опыт работы
Примеры стиля:
'Анна умеет располагать к себе даже самого капризного клиента. Она всегда найдёт подход и интересную тему для общения. А ещё она легко и очень профессионально выполняет свою работу, что подтверждают многочисленные положительные отзывы. Вы точно захотите к ней вернуться!'
'Снежана очень быстро и легко выполняет депиляцию как женщинам, так и мужчинам. Если Вы - не любитель долгих разговоров и длительных процедур, то это , безусловно, ваш мастер! Быстро, качественно и комфортно без лишних слов.'
'Несмотря на малый опыт, Ксения уже завоевала сердца наших клиентов и заслуженно получила много положительных отзывов. Этот мастер очень внимателен к деталям. Индивидуальный подход к каждому клиенту и качественный результат для Ксении важнее всего.'
'Анастасия - очень аккуратный и внимательный мастер. Её лёгкая рука сделает услугу максимально безболезненной и быстрой. А большой багаж знаний и опыта поможет без труда подобрать домашний уходу для любого типа кожи и волос. Анастасию ценят за её профессионализм и ответственный подход к работе.'
В ответе укажи ТОЛЬКО готовое описание, уложившись в 300 символов.`;
    }

    async generateDescription(userInput: string): Promise<string> {
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: this.prompt
                    },
                    {
                        role: 'user',
                        content: userInput
                    }
                ],
                temperature: 0.7,
                max_tokens: 500,
                presence_penalty: 0.3,
                frequency_penalty: 0.5
            });

            const generatedText = completion.choices[0]?.message?.content?.trim() || '';

            // Проверяем длину текста
            if (generatedText.length > 300) {
                return generatedText.substring(0, 300) + '...';
            }

            return generatedText;
        } catch (error: any) {
            console.error('OpenAI API Error:', {
                error: error.message,
                userInput
                
            });

            if (error.response?.status === 429) {
                throw new Error('Слишком много запросов. Пожалуйста, подождите немного и попробуйте снова.');
            }

            throw new Error('Не удалось сгенерировать описание. Пожалуйста, попробуйте позже.');
        }
    }
}

export const openAIService = new OpenAIService();