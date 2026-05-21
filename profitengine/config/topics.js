'use strict';

const TOPICS = [
  {
    niche: 'passive income',
    title_template: 'Best Passive Income Strategies {year}',
    keywords: ['passive income', 'passive income tips', 'passive income {year}', 'financial freedom'],
    description: 'Proven passive income strategies that generate revenue with minimal ongoing effort'
  },
  {
    niche: 'affiliate marketing',
    title_template: 'Best Affiliate Marketing Strategies {year}',
    keywords: ['affiliate marketing', 'affiliate marketing tips', 'affiliate programs {year}'],
    description: 'High-converting affiliate marketing approaches for bloggers and content creators'
  },
  {
    niche: 'ai tools',
    title_template: 'Best AI Tools and Strategies {year}',
    keywords: ['ai tools', 'artificial intelligence tools', 'best ai {year}', 'ai productivity'],
    description: 'Top AI-powered tools that save time and unlock new income opportunities'
  },
  {
    niche: 'side hustle',
    title_template: 'Best Side Hustle Strategies {year}',
    keywords: ['side hustle', 'side hustle ideas', 'make money online {year}'],
    description: 'Practical side hustles with real earning potential you can start this week'
  },
  {
    niche: 'print on demand',
    title_template: 'Best Print on Demand Strategies {year}',
    keywords: ['print on demand', 'print on demand tips', 'pod business {year}'],
    description: 'Print-on-demand business strategies from niche selection to passive sales'
  }
];

function getTodayTopic(date) {
  const idx = Math.floor(date.getTime() / 86400000) % TOPICS.length;
  return TOPICS[idx];
}

module.exports = { TOPICS, getTodayTopic };
